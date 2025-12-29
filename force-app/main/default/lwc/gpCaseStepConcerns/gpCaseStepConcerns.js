import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import getConcernCatalog from '@salesforce/apex/GPCaseService.getConcernCatalog';
import saveConcerns from '@salesforce/apex/GPCaseService.saveConcerns';
import { getRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';

const SOURCE_LABELS = {
    topSymptoms: 'Top Symptoms',
    priorDiagnoses: 'Prior Diagnoses',
    psychosisSymptoms: 'Psychosis Symptoms',
    maniaSymptoms: 'Mania/Hypomania Symptoms',
    medicalRedFlags: 'Medical Red Flags',
    familyHistory: 'Family History',
    withdrawalTreatment: 'Withdrawal and Treatment',
    substanceUseMentalHealth: 'Substance Use and Mental Health',
    preventionRiskManagement: 'Prevention and Risk Management',
    socialEnvironmentalFactors: 'Social and Environmental Factors',
    healthComplications: 'Health Complications',
    supportRecovery: 'Support and Recovery',
    manual: 'Manual Add'
};

const TOP_SYMPTOM_OPTIONS = [
    'Depressed mood', 'Anhedonia', 'Anxiety', 'Panic', 'Insomnia', 'Hypersomnia',
    'Appetite change', 'Low energy', 'Poor concentration', 'Psychosis', 'Mania/hypomania',
    'Agitation/violence', 'Cognitive change', 'Trauma symptoms', 'Substance-related',
    'Suicidal thoughts', 'Homicidal thoughts', 'Somatic symptoms'
];

const looksLikeId = (value) => {
    if (!value || typeof value !== 'string') {
        return false;
    }
    const trimmed = value.trim();
    if (trimmed.length !== 15 && trimmed.length !== 18) {
        return false;
    }
    return /^[a-zA-Z0-9]+$/.test(trimmed);
};

const PRIOR_DX_OPTIONS = [
    'MDD', 'Bipolar I', 'Bipolar II', 'GAD', 'Panic Disorder', 'PTSD',
    'Psychotic Disorder', 'ADHD', 'OCD', 'SUD', 'Personality Disorder', 'Eating Disorder'
];

const PSYCHOSIS_SYMPTOMS_OPTIONS = [
    'Auditory hallucinations', 'Visual hallucinations', 'Tactile/other hallucinations',
    'Persecutory delusions', 'Ideas of reference', 'Grandiosity',
    'Thought disorganization', 'Bizarre behavior', 'Catatonia'
];

const MANIA_SYMPTOMS_OPTIONS = [
    'Decreased need for sleep', 'Pressured speech', 'Racing thoughts',
    'Grandiosity', 'Risky spending/sex/driving', 'Increased goal-directed activity', 'Irritability', 'Distractibility'
];

const MEDICAL_RED_FLAG_OPTIONS = [
    'Fever/infection', 'Head injury', 'Seizure', 'Thyroid/endocrine',
    'Pain/untreated', 'Steroid or stimulant use', 'Medication started/stopped',
    'Delirium suspected', 'Sleep apnea'
];

const FAMILY_HISTORY_OPTIONS = [
    'Bipolar', 'Psychosis/Schizophrenia', 'Suicide', 'SUD',
    'Depression/Anxiety', 'Unknown'
];

const WITHDRAWAL_TREATMENT_OPTIONS = [
    'Acute Withdrawal Symptoms',
    'Medication-Assisted Treatment (MAT) Needs',
    'Cravings Management'
];

const SUBSTANCE_USE_MENTAL_HEALTH_OPTIONS = [
    'Chronic Substance Use',
    'Dual Diagnosis (Substance Use and Mental Health)',
    'Co-occurring Disorders',
    'Trauma and Substance Use'
];

const PREVENTION_RISK_MANAGEMENT_OPTIONS = [
    'Relapse Prevention',
    'Overdose Risks',
    'Harm Reduction Strategies'
];

const SOCIAL_ENVIRONMENTAL_FACTORS_OPTIONS = [
    'Social Isolation due to Substance Use',
    'Legal Issues Related to Substance Use',
    'Family Dynamics and Substance Use',
    'Housing Stability and Substance Use',
    'Financial Instability Related to Substance Use',
    'Social Determinants of Health Impacting Recovery'
];

const HEALTH_COMPLICATIONS_OPTIONS = [
    'Physical Health Complications from Substance Use'
];

const SUPPORT_RECOVERY_OPTIONS = [
    'Peer Support Group Needs'
];

const CATALOG = buildCatalog();

function slugify(value = '') {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildCatalog() {
    const entries = [];
    const addEntries = (category, list) => {
        list.forEach(label => {
            entries.push({
                id: `${slugify(category)}-${slugify(label)}`,
                category,
                label
            });
        });
    };
    addEntries('Top Symptoms', TOP_SYMPTOM_OPTIONS);
    addEntries('Prior Diagnoses', PRIOR_DX_OPTIONS);
    addEntries('Psychosis Symptoms', PSYCHOSIS_SYMPTOMS_OPTIONS);
    addEntries('Mania/Hypomania Symptoms', MANIA_SYMPTOMS_OPTIONS);
    addEntries('Medical Red Flags', MEDICAL_RED_FLAG_OPTIONS);
    addEntries('Family History (1st-degree)', FAMILY_HISTORY_OPTIONS);
    addEntries('Withdrawal and Treatment', WITHDRAWAL_TREATMENT_OPTIONS);
    addEntries('Substance Use and Mental Health', SUBSTANCE_USE_MENTAL_HEALTH_OPTIONS);
    addEntries('Prevention and Risk Management', PREVENTION_RISK_MANAGEMENT_OPTIONS);
    addEntries('Social and Environmental Factors', SOCIAL_ENVIRONMENTAL_FACTORS_OPTIONS);
    addEntries('Health Complications', HEALTH_COMPLICATIONS_OPTIONS);
    addEntries('Support and Recovery', SUPPORT_RECOVERY_OPTIONS);
    return entries;
}

const CATALOG_INDEX = CATALOG.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));

export default class GpCaseStepConcerns extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;

    @track catalog = [];
    @track catalogIndex = {};

    @track concernMode = 'list';
    @track concerns = [];
    @track searchValue = '';
    @track categoryFilter = 'all';
    @track showAllNotes = false;
    @track isSaving = false;
    confirmRemoveId = null;
    hasLoadedInitialData = false;
    pendingSuccessMessage = null;

    wizardStep = 0;
    wizardMode = 'add';
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardCategoryFilter = 'all';
    wizardSearch = '';
    hydratedFromServer = false;
    caseTypeFromRecord;
    wiredCaseDataResult;

    @api
    set data(value) {
        if (Array.isArray(value)) {
            this.concerns = cloneList(value);
        } else {
            this.concerns = [];
        }
        if (this.concerns.length) {
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
        }
        // Debug: track incoming data length
        // eslint-disable-next-line no-console
        console.error(`[gpCaseStepConcerns] set data len=${this.concerns.length} caseId=${this.caseId} recordId=${this.recordId}`);
    }

    get data() {
        return cloneList(this.concerns);
    }

    get effectiveCaseId() {
        return this.caseId || this.recordId || null;
    }

    get isStandaloneLayout() {
        return this.layoutMode || (!!this.recordId && !this.caseId);
    }

    get showNavigation() {
        return !this.isStandaloneLayout && !this.isWizardMode;
    }

    get readOnlyNotes() {
        return this.isStandaloneLayout;
    }

    notePreview(value) {
        if (!value) {
            return '';
        }
        const str = value.toString();
        return str.length > 255 ? `${str.slice(0, 255)}…` : str;
    }

    get isListMode() {
        return this.concernMode === 'list';
    }

    get isWizardMode() {
        return this.concernMode === 'wizard';
    }

    get showAddButton() {
        // Permite Add en relatedCase; oculto solo en patient
        const caseType = (this.caseTypeFromRecord || this.caseType || '').toLowerCase();
        const isAddictionMedicine = caseType === 'addiction medicine' || caseType.includes('addiction');
        if (isAddictionMedicine && this.effectiveLayoutContext === 'case') {
            return false;
        }
        return this.isListMode && this.effectiveLayoutContext !== 'patient';
    }

    get showEmptyState() {
        const caseType = (this.caseTypeFromRecord || this.caseType || '').toLowerCase();
        const isAddictionMedicine = caseType === 'addiction medicine' || caseType.includes('addiction');
        if (isAddictionMedicine && this.effectiveLayoutContext === 'case') {
            return false;
        }
        return true;
    }

    get concernsCount() {
        return this.concerns.length;
    }

    get concernsCountDisplay() {
        // Siempre mostrar el conteo real en relatedCase y patient; en case puedes ajustar si quieres 10+
        if (this.effectiveLayoutContext === 'case') {
            return this.concernsCount > 10 ? '10+' : this.concernsCount;
        }
        return this.concernsCount;
    }

    @api
    get layoutContext() {
        return this._layoutContext;
    }

    set layoutContext(value) {
        this._layoutContext = (value || 'auto').toLowerCase();
    }

    get effectiveLayoutContext() {
        if (this._layoutContext && this._layoutContext !== 'auto') {
            return this._layoutContext;
        }
        if (this.isStandaloneLayout && !this.caseId && this.recordId) {
            return 'relatedcase';
        }
        return 'case';
    }

    get headerTitle() {
        switch (this.effectiveLayoutContext) {
        case 'relatedcase':
            return `Concerns for Parent Case (${this.concernsCountDisplay})`;
        case 'patient':
            return `Patient Concerns (${this.concernsCountDisplay})`;
        default:
            return `Concerns (${this.concernsCount})`;
        }
    }

    get headerIconName() {
        return 'utility:people';
    }

    get categoryOptions() {
        const categories = Array.from(new Set(this.catalog.map(item => item.category).filter(Boolean)));
        return [{ label: 'All categories', value: 'all' }, ...categories.map(cat => ({ label: cat, value: cat }))];
    }

    get wizardCategoryOptions() {
        return this.categoryOptions;
    }

    get hasConcerns() {
        return this.concerns.length > 0;
    }

    get filteredConcerns() {
        const term = (this.searchValue || '').toLowerCase();
        return this.concerns
            .filter(item => this.categoryFilter === 'all' || item.category === this.categoryFilter)
            .filter(item => {
                if (!term) return true;
                return (item.label || '').toLowerCase().includes(term) || (item.notes || '').toLowerCase().includes(term);
            })
            .map(item => ({
                ...item,
                showConfirm: this.confirmRemoveId === item.id,
                sourceLabel: SOURCE_LABELS[item.source] || item.source || 'Manual',
                previewNotes: this.notePreview(item.notes)
            }));
    }

    handleCategoryFilter(event) {
        this.categoryFilter = event.target.value;
    }

    handleSearchChange(event) {
        this.searchValue = event.target.value;
    }

    toggleShowNotes() {
        this.showAllNotes = !this.showAllNotes;
    }

    handleNoteChange(event) {
        const id = event.target.dataset.id;
        const value = event.target.value;
        this.concerns = this.concerns.map(item => item.id === id ? { ...item, notes: value } : item);
        this.emitDraftChange();
    }

    handleRemoveConcern(event) {
        this.confirmRemoveId = event.currentTarget.dataset.id;
    }

    async confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        const label = event.currentTarget.dataset.label;
        const category = event.currentTarget.dataset.category;
        this.concerns = this.concerns.filter(item => {
            if (id) {
                return item.id !== id;
            }
            return !(item.label === label && item.category === category);
        });
        this.confirmRemoveId = null;
        this.pendingSuccessMessage = 'Concern was removed.';
        if (this.isStandaloneLayout) {
            await this.handleStandaloneSave();
        } else {
            this.emitDraftChange();
        }
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    openWizard() {
        this.concernMode = 'wizard';
        this.wizardMode = 'add';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardCategoryFilter = 'all';
    }

    cancelWizard() {
        this.concernMode = 'list';
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardStep = 0;
    }

    openWizardForEdit(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const currentConcerns = cloneList(this.concerns || [])
            .map(item => {
                const fallbackId = item?.id || item?.label || null;
                return fallbackId ? { ...item, id: fallbackId } : null;
            })
            .filter(Boolean);
        if (!currentConcerns.length) {
            this.openWizard();
            return;
        }
        this.concernMode = 'wizard';
        this.wizardMode = 'edit';
        this.wizardSelection = currentConcerns.map(item => item.id);
        this.wizardDraft = currentConcerns.map(item => ({
            id: item.id,
            meta: this.catalogIndex[item.id] || {
                label: item.label || item.id,
                category: item.category || ''
            },
            notes: item.notes || ''
        }));
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardCategoryFilter = 'all';
    }

    /* Wizard */
    get wizardStepLabel() {
        if (this.wizardStep === 0) return 'Pick concerns';
        if (this.wizardStep === 1) return 'Add notes';
        return 'Review';
    }

    get wizardStepIsPick() {
        return this.wizardStep === 0;
    }

    get wizardStepIsDetails() {
        return this.wizardStep === 1;
    }

    get wizardStepIsReview() {
        return this.wizardStep === 2;
    }

    get wireCaseId() {
        return this.caseId || this.recordId || null;
    }

    get catalogCaseType() {
        if (this.caseType) {
            return this.caseType;
        }
        return this.caseTypeFromRecord || null;
    }

    @wire(getRecord, { recordId: '$wireCaseId', fields: [CASE_TYPE_FIELD] })
    wiredCaseRecord({ data, error }) {
        if (data) {
            this.caseTypeFromRecord = data.fields.Case_Type__c?.value || null;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading case type', error);
        }
    }

    @wire(getCaseFullData, { caseId: '$wireCaseId' })
    wiredCaseData({ data, error }) {
        this.wiredCaseDataResult = { data, error };
        if (data && this.isStandaloneLayout) {
            const cons = Array.isArray(data.concerns) ? data.concerns : [];
            this.concerns = cloneList(cons);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepConcerns] refreshed via wire len=${this.concerns.length}`);
        } else if (data && !this.hydratedFromServer && !this.concerns.length) {
            const cons = Array.isArray(data.concerns) ? data.concerns : [];
            this.concerns = cloneList(cons);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepConcerns] hydrated via wire len=${this.concerns.length}`);
        }
        if (error) {
            // Surface wire issues to console; UI is read-only until data loads.
            // eslint-disable-next-line no-console
            console.error('Error loading concerns', error);
        }
    }

    @wire(getConcernCatalog, { caseType: '$catalogCaseType' })
    wiredConcernCatalog({ data, error }) {
        if (data && Array.isArray(data) && data.length) {
            this.catalog = data.map(item => ({
                id: item.id,
                label: item.label,
                category: item.category || ''
            }));
            const index = {};
            this.catalog.forEach(item => {
                index[item.id] = item;
            });
            this.catalogIndex = index;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading concern catalog', error);
        }
    }

    get wizardBackDisabled() {
        return this.wizardStep === 0;
    }

    get wizardNextDisabled() {
        if (this.wizardStep === 0) {
            return this.wizardSelection.length === 0;
        }
        if (this.wizardStep === 1) {
            return this.wizardDraft.length === 0;
        }
        return false;
    }

    get wizardInlineDotPick() {
        return this.getInlineDotClass(0);
    }

    get wizardInlineDotDetails() {
        return this.getInlineDotClass(1);
    }

    get wizardInlineDotReview() {
        return this.getInlineDotClass(2);
    }

    getInlineDotClass(step) {
        return this.wizardStep >= step ? 'inline-dot active' : 'inline-dot';
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.concerns.map(c => c.catalogId || c.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return this.catalog
            .filter(item => this.wizardCategoryFilter === 'all' || item.category === this.wizardCategoryFilter)
            .filter(item => {
                if (!term) return true;
                return (item.label || '').toLowerCase().includes(term);
            })
            .map(item => {
                const disabled = existingIds.has(item.id) && this.wizardMode === 'add';
                const checked = existingIds.has(item.id) || this.wizardSelection.includes(item.id);
                const classes = ['catalog-card'];
                if (checked) classes.push('selected');
                if (disabled) classes.push('disabled');
                return {
                    ...item,
                    disabled,
                    checked,
                    className: classes.join(' ')
                };
            });
    }

    get wizardResultCount() {
        return this.wizardCatalogItems.length;
    }

    handleWizardCategoryChange(event) {
        this.wizardCategoryFilter = event.target.value;
    }

    handleWizardSearch(event) {
        this.wizardSearch = event.target.value;
    }

    handleWizardSelectionToggle(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        if (this.wizardMode === 'add') {
            const existingIds = new Set(this.concerns.map(concern => concern.id));
            if (existingIds.has(id)) {
                return;
            }
        }
        if (this.wizardSelection.includes(id)) {
            this.wizardSelection = this.wizardSelection.filter(sel => sel !== id);
        } else {
            this.wizardSelection = [...this.wizardSelection, id];
        }
    }

    handleSelectAllFiltered() {
        const selectable = this.wizardCatalogItems.filter(item => !item.disabled).map(item => item.id);
        this.wizardSelection = Array.from(new Set([...this.wizardSelection, ...selectable]));
    }

    handleClearSelection() {
        this.wizardSelection = [];
    }

    wizardNext() {
        if (this.wizardStep === 0) {
            const draftById = new Map(this.wizardDraft.map(item => [item.id, item]));
            const concernsById = new Map((this.concerns || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            this.wizardDraft = this.wizardSelection.map(id => {
                const existing = draftById.get(id) || concernsById.get(id);
                const meta = existing?.meta || this.catalogIndex[id] || {
                    label: (this.catalogIndex[id] && this.catalogIndex[id].label) || existing?.label || id,
                    category: (this.catalogIndex[id] && this.catalogIndex[id].category) || existing?.category || ''
                };
                return {
                    id,
                    meta,
                    notes: existing?.notes || ''
                };
            });
            this.wizardStep = 1;
            return;
        }
        if (this.wizardStep === 1) {
            if (this.wizardDraft.length === 0) return;
            this.wizardStep = 2;
            return;
        }
        if (this.wizardStep === 2) {
            this.saveWizardDraft();
        }
    }

    wizardBack() {
        if (this.wizardStep === 0) {
            this.cancelWizard();
            return;
        }
        this.wizardStep -= 1;
    }

    handleWizardDetailChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const field = event.target.dataset.field;
        const value = event.target.value;
        this.wizardDraft = this.wizardDraft.map(item => item.id === id ? { ...item, [field]: value } : item);
    }

    handleWizardRemoveDraft(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.wizardDraft = this.wizardDraft.filter(item => item.id !== id);
        this.wizardSelection = this.wizardSelection.filter(item => item !== id);
        if (this.wizardDraft.length === 0) {
            this.wizardStep = 0;
        }
    }

    handleReviewEditDetails() {
        this.wizardStep = 1;
    }

    handleReviewChangeSelection() {
        this.wizardStep = 0;
    }

    saveWizardDraft() {
        const additions = this.wizardDraft.map(item => ({
            id: item.id,
            label: item.meta.label,
            category: item.meta.category,
            notes: item.notes,
            source: 'manual'
        }));
        const byId = new Map(this.concerns.map(c => [c.id, c]));
        additions.forEach(entry => {
            byId.set(entry.id, { ...(byId.get(entry.id) || {}), ...entry });
        });
        this.concerns = Array.from(byId.values());
        this.emitDraftChange();
        this.cancelWizard();
    }

    /* Actions */
    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = cloneList(this.concerns);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save concerns.', 'error');
            return;
        }
        const payload = this.buildConcernPayload();
        this.isSaving = true;
        try {
            await saveConcerns({
                caseId: this.effectiveCaseId,
                items: payload,
                deleteMissing: true
            });
            const message = this.pendingSuccessMessage || 'Concerns saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (this.isStandaloneLayout) {
                this.refreshPageLayout();
            }
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving concerns';
            this.showToast('Error', message, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    refreshPageLayout() {
        try {
            getRecordNotifyChange([{ recordId: this.effectiveCaseId }]);
        } catch (e) {
            // ignore notify issues
        }
        if (this.wiredCaseDataResult) {
            refreshApex(this.wiredCaseDataResult);
        }
    }

    emitDraftChange() {
        const payload = cloneList(this.concerns);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isStandaloneLayout && !this.isSaving) {
            // Auto-save when used standalone in a page layout
            this.handleStandaloneSave();
        }
    }

    buildConcernPayload() {
        const mapped = cloneList(this.concerns)
            .map(item => ({
                catalogId: looksLikeId(item.catalogId)
                    ? item.catalogId
                    : (looksLikeId(item.id) ? item.id : null),
                label: item.label || '',
                category: item.category || '',
                notes: item.notes || null
            }))
            .filter(entry => entry.label);
        const byKey = new Map();
        mapped.forEach(item => {
            const key = item.catalogId || item.label.toLowerCase();
            if (!byKey.has(key)) {
                byKey.set(key, item);
            }
        });
        return Array.from(byKey.values());
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant: variant || 'info'
        }));
    }
}