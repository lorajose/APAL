import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import getSafetyRiskCatalog from '@salesforce/apex/GPCaseService.getSafetyRiskCatalog';
import saveSafetyRisks from '@salesforce/apex/GPCaseService.saveSafetyRisks';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const SOURCE_LABELS = {
    Step8_PsychologicalStressors: 'Step 8: Psychosocial Stressors',
    Manual: 'Manual Add',
    'Migration/Import': 'Migration/Import',
    Other: 'Other'
};

export default class GpCaseStepSafetyRisks extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;
    _layoutContext = 'auto'; // auto | case | relatedcase

    @track catalog = [];
    @track catalogIndex = {};
    caseTypeFromRecord;

    @track safetyMode = 'grid';
    @track risks = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = false;
    confirmRemoveId = null;
    @track isSaving = false;
    hasLoadedInitialData = false;
    pendingSuccessMessage = null;

    wizardStep = 0;
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardCategoryFilter = 'all';
    wizardSearch = '';
    hydratedFromServer = false;
    wiredCaseDataResult;

    @api
    set data(value) {
        this.risks = Array.isArray(value) ? cloneList(value) : [];
        if (this.risks.length) {
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
        }
        // Debug: track incoming data length
        // eslint-disable-next-line no-console
        console.error(`[gpCaseStepSafetyRisks] set data len=${this.risks.length} caseId=${this.caseId} recordId=${this.recordId}`);
    }

    get data() {
        return cloneList(this.risks);
    }

    get risksCount() {
        return this.risks.length;
    }

    get risksCountDisplay() {
        return this.risksCount > 10 ? '10+' : this.risksCount;
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
            return `Safety Risks for Parent Case (${this.risksCount})`;
        default:
            return `Safety Risks (${this.risksCountDisplay})`;
        }
    }

    get headerIconName() {
        return 'utility:people';
    }

    get effectiveCaseId() {
        return this.caseId || this.recordId || null;
    }

    get isStandaloneLayout() {
        return this.layoutMode || (!!this.recordId && !this.caseId);
    }

    get showNavigation() {
        return !this.isStandaloneLayout && !this.isWizardView;
    }

    get showAddButton() {
        return this.isGridView;
    }

    get showEmptyState() {
        return true;
    }

    get readOnlyNotes() {
        return this.isGridView;
    }

    get readOnlyFields() {
        return this.isGridView;
    }

    notePreview(value) {
        if (!value) {
            return '';
        }
        const str = value.toString();
        return str.length > 255 ? `${str.slice(0, 255)}…` : str;
    }

    buildPatientSafetyRiskLink(recordId) {
        if (!recordId || typeof recordId !== 'string') {
            return null;
        }
        const trimmed = recordId.trim();
        if (trimmed.length === 15 || trimmed.length === 18) {
            return `/lightning/r/Patient_Safety_Risk__c/${trimmed}/view`;
        }
        return null;
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
            const risks = Array.isArray(data.safetyRisks) ? data.safetyRisks : [];
            this.risks = cloneList(risks);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepSafetyRisks] refreshed via wire len=${this.risks.length}`);
        } else if (data && !this.hydratedFromServer && !this.risks.length) {
            const risks = Array.isArray(data.safetyRisks) ? data.safetyRisks : [];
            this.risks = cloneList(risks);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepSafetyRisks] hydrated via wire len=${this.risks.length}`);
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading safety risks', error);
        }
    }

    @wire(getSafetyRiskCatalog, { caseType: '$catalogCaseType' })
    wiredSafetyCatalog({ data, error }) {
        if (data && Array.isArray(data) && data.length) {
            this.catalog = data.map(item => ({
                id: item.id,
                name: item.name,
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
            console.error('Error loading safety risk catalog', error);
        }
    }

    get isGridView() {
        return this.safetyMode === 'grid';
    }

    get isWizardView() {
        return this.safetyMode === 'wizard';
    }

    get isRelatedCase() {
        return this.effectiveLayoutContext === 'relatedcase';
    }

    get hasRisks() {
        return this.risks.length > 0;
    }

    get filterOptions() {
        return [
            { label: 'Name', value: 'name' },
            { label: 'Category', value: 'category' },
            { label: 'Notes', value: 'notes' }
        ];
    }

    get filteredRisks() {
        const term = (this.searchValue || '').toLowerCase();
        return this.risks
            .map(item => ({
                ...item,
                meta: (() => {
                    const base = this.catalogIndex[item.id] || {};
                    const displayName = item.catalogName
                        || item.meta?.name
                        || base.name
                        || item.recordName
                        || item.name
                        || item.id;
                    const category = item.meta?.category
                        || item.catalogCategory
                        || base.category
                        || '';
                    return { ...base, name: displayName, category };
                })(),
                recordName: item.recordName || item.name || null,
                recordLink: this.buildPatientSafetyRiskLink(item.recordId),
                showConfirm: this.confirmRemoveId === item.id,
                sourceLabel: SOURCE_LABELS[item.source] || item.source || 'Manual',
                previewNotes: this.notePreview(item.notes)
            }))
            .filter(item => {
                if (!term) return true;
                if (this.filterBy === 'category') {
                    return (item.meta.category || '').toLowerCase().includes(term);
                }
                if (this.filterBy === 'notes') {
                    return (item.notes || '').toLowerCase().includes(term);
                }
                return (item.meta.name || '').toLowerCase().includes(term);
            });
    }

    handleFilterChange(event) {
        this.filterBy = event.target.value;
    }

    handleSearchChange(event) {
        this.searchValue = event.target.value;
    }

    toggleShowNotes() {
        this.showAllNotes = !this.showAllNotes;
    }

    handleAddRisks() {
        this.safetyMode = 'wizard';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardCategoryFilter = 'all';
    }

    handleEditRisksWizard(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const current = (this.risks || [])
            .map(risk => {
                const id = risk?.id || risk?.catalogName || risk?.meta?.name;
                return id ? { ...risk, id } : null;
            })
            .filter(Boolean);
        if (!current.length) {
            this.handleAddRisks();
            return;
        }
        this.safetyMode = 'wizard';
        this.wizardSelection = current.map(risk => risk.id);
        this.wizardDraft = current.map(risk => {
            const meta = this.catalogIndex[risk.id] || {
                name: risk.catalogName || risk.id,
                category: risk.catalogCategory || ''
            };
            return {
                id: risk.id,
                meta,
                catalogName: risk.catalogName || meta.name || risk.id,
                catalogCategory: risk.catalogCategory || meta.category || '',
                recent: risk.recent === undefined ? false : risk.recent,
                historical: risk.historical === undefined ? false : risk.historical,
                notes: risk.notes || ''
            };
        });
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardCategoryFilter = 'all';
    }

    handleFlagToggle(event) {
        const id = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.checked;
        this.risks = this.risks.map(item => item.id === id ? { ...item, [field]: value } : item);
        this.emitDraftChange();
    }

    handleNoteChange(event) {
        const id = event.target.dataset.id;
        const value = event.target.value;
        this.risks = this.risks.map(item => item.id === id ? { ...item, notes: value } : item);
        this.emitDraftChange();
    }

    handleRemoveRisk(event) {
        this.confirmRemoveId = event.currentTarget.dataset.id;
    }

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.risks = this.risks.filter(item => item.id !== id);
        this.confirmRemoveId = null;
        this.pendingSuccessMessage = 'Safety risk was removed.';
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    /* Wizard helpers */
    get wizardStepLabel() {
        if (this.wizardStep === 0) return 'Pick safety risks';
        if (this.wizardStep === 1) return 'Enter details';
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

    get wizardCategoryOptions() {
        const categories = Array.from(new Set(this.catalog.map(item => item.category).filter(Boolean)));
        return [{ label: 'All categories', value: 'all' }, ...categories.map(cat => ({ label: cat, value: cat }))];
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.risks.map(risk => risk.catalogId || risk.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return this.catalog
            .filter(item => this.wizardCategoryFilter === 'all' || item.category === this.wizardCategoryFilter)
            .filter(item => {
                if (!term) return true;
                return (item.name || '').toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
            })
            .map(item => {
                const disabled = existingIds.has(item.id);
                const checked = existingIds.has(item.id) || this.wizardSelection.includes(item.id);
                const classList = ['catalog-card'];
                if (checked) classList.push('selected');
                if (disabled) classList.push('disabled');
                return {
                    ...item,
                    disabled,
                    checked,
                    className: classList.join(' ')
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
            const existingIds = new Set(this.safetyRisks.map(risk => risk.id));
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
            const risksById = new Map((this.risks || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            this.wizardDraft = this.wizardSelection.map(id => {
                const existing = draftById.get(id) || risksById.get(id);
                const meta = existing?.meta || this.catalogIndex[id] || {
                    name: existing?.catalogName || existing?.recordName || id,
                    category: existing?.catalogCategory || ''
                };
                return {
                    id,
                    meta,
                    catalogName: existing?.catalogName || meta.name || id,
                    catalogCategory: existing?.catalogCategory || meta.category || '',
                    recent: existing?.recent ?? false,
                    historical: existing?.historical ?? false,
                    notes: existing?.notes || '',
                    flagError: false
                };
            });
            this.wizardStep = 1;
            return;
        }
        if (this.wizardStep === 1) {
            // No required validation; allow moving on even with empty selection/flags.
            this.wizardDraft = [...this.wizardDraft];
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

    cancelWizard() {
        this.safetyMode = 'grid';
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardStep = 0;
    }

    handleWizardDetailChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
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
        const additions = this.wizardDraft.map(item => {
            const meta = this.catalogIndex[item.id] || {};
            return {
                id: item.id,
                catalogName: item.catalogName || meta.name || '',
                catalogCategory: item.catalogCategory || meta.category || '',
                recent: item.recent,
                historical: item.historical,
                notes: item.notes
            };
        });
        const existingMap = new Map(this.risks.map(item => [item.id, item]));
        additions.forEach(entry => {
            existingMap.set(entry.id, { ...existingMap.get(entry.id), ...entry });
        });
        this.risks = Array.from(existingMap.entries()).map(([id, value]) => ({
            id,
            ...value
        }));
        this.emitDraftChange();
        this.cancelWizard();
    }

    /* actions */
    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = cloneList(this.risks);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save safety risks.', 'error');
            return;
        }
        const payload = this.buildSafetyRiskPayload();
        this.isSaving = true;
        try {
            await saveSafetyRisks({
                caseId: this.effectiveCaseId,
                items: payload
            });
            const message = this.pendingSuccessMessage || 'Safety risks saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (this.isStandaloneLayout) {
                this.refreshPageLayout();
            }
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving safety risks';
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
        const payload = cloneList(this.risks);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isStandaloneLayout && !this.isSaving) {
            // Auto-save when used standalone in a page layout
            this.handleStandaloneSave();
        }
    }

    buildSafetyRiskPayload() {
        return cloneList(this.risks)
            .map(risk => {
                const meta = this.catalogIndex[risk.id] || {};
                const catalogName = risk.catalogName || meta.name || '';
                if (!catalogName) {
                    return null;
                }
                const idValue = risk.catalogId || risk.id;
                const catalogId = (typeof idValue === 'string'
                    && (idValue.length === 15 || idValue.length === 18)
                    && /^[a-zA-Z0-9]+$/.test(idValue))
                    ? idValue
                    : null;
                return {
                    catalogId,
                    catalogName,
                    catalogCategory: risk.catalogCategory || meta.category || '',
                    recent: risk.recent === undefined ? null : risk.recent,
                    historical: risk.historical === undefined ? null : risk.historical,
                    notes: risk.notes || null
                };
            })
            .filter(Boolean);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant: variant || 'info'
        }));
    }
}