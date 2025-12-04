import { LightningElement, api, track } from 'lwc';

const SOURCE_LABELS = {
    topSymptoms: 'Top Symptoms',
    priorDiagnoses: 'Prior Diagnoses',
    psychosisSymptoms: 'Psychosis Symptoms',
    maniaSymptoms: 'Mania/Hypomania Symptoms',
    medicalRedFlags: 'Medical Red Flags',
    familyHistory: 'Family History',
    manual: 'Manual Add'
};

const TOP_SYMPTOM_OPTIONS = [
    'Depressed mood', 'Anhedonia', 'Anxiety', 'Panic', 'Insomnia', 'Hypersomnia',
    'Appetite change', 'Low energy', 'Poor concentration', 'Psychosis', 'Mania/hypomania',
    'Agitation/violence', 'Cognitive change', 'Trauma symptoms', 'Substance-related',
    'Suicidal thoughts', 'Homicidal thoughts', 'Somatic symptoms'
];

const PRIOR_DX_OPTIONS = [
    'MDD', 'Bipolar I', 'Bipolar II', 'GAD', 'Panic Disorder', 'PTSD',
    'Psychotic Disorder', 'ADHD', 'OCD', 'SUD', 'Personality Disorder', 'Eating Disorder', 'Other', 'Unknown'
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
    'Delirium suspected', 'Sleep apnea', 'Other/Unknown'
];

const FAMILY_HISTORY_OPTIONS = [
    'Bipolar', 'Psychosis/Schizophrenia', 'Suicide', 'SUD',
    'Depression/Anxiety', 'None', 'Unknown'
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
    return entries;
}

const CATALOG_INDEX = CATALOG.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));

export default class GpCaseStepConcerns extends LightningElement {
    @api caseId;

    @track concernMode = 'list';
    @track concerns = [];
    @track searchValue = '';
    @track categoryFilter = 'all';
    @track showAllNotes = false;
    confirmRemoveId = null;

    wizardStep = 0;
    wizardMode = 'add';
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardCategoryFilter = 'all';
    wizardSearch = '';

    @api
    set data(value) {
        if (Array.isArray(value)) {
            this.concerns = cloneList(value);
        } else {
            this.concerns = [];
        }
    }

    get data() {
        return cloneList(this.concerns);
    }

    get isListMode() {
        return this.concernMode === 'list';
    }

    get isWizardMode() {
        return this.concernMode === 'wizard';
    }

    get categoryOptions() {
        const categories = Array.from(new Set(CATALOG.map(item => item.category)));
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
                sourceLabel: SOURCE_LABELS[item.source] || item.source || 'Manual'
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

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.concerns = this.concerns.filter(item => item.id !== id);
        this.confirmRemoveId = null;
        this.emitDraftChange();
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
        const existingIds = new Set(this.concerns.map(c => c.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return CATALOG
            .filter(item => this.wizardCategoryFilter === 'all' || item.category === this.wizardCategoryFilter)
            .filter(item => {
                if (!term) return true;
                return (item.label || '').toLowerCase().includes(term);
            })
            .map(item => {
                const disabled = existingIds.has(item.id) && this.wizardMode === 'add';
                const checked = this.wizardSelection.includes(item.id);
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
            this.wizardDraft = this.wizardSelection.map(id => ({
                id,
                meta: CATALOG_INDEX[id],
                notes: ''
            }));
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
        const existingIds = new Set(this.concerns.map(c => c.id));
        const merged = [...this.concerns];
        additions.forEach(entry => {
            if (!existingIds.has(entry.id)) {
                merged.push(entry);
            }
        });
        this.concerns = merged;
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

    emitDraftChange() {
        const payload = cloneList(this.concerns);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }
}