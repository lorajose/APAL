import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import getScreenerCatalog from '@salesforce/apex/GPCaseService.getScreenerCatalog';
import saveScreeners from '@salesforce/apex/GPCaseService.saveScreeners';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';


const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const STEP_NUMBER = 12;

export default class GpCaseStepScreeners extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;
    _layoutContext = 'auto'; // auto | case | relatedcase
    caseTypeFromRecord;

    @track catalog = [];
    @track catalogIndex = {};

    @track screenerMode = 'grid';
    @track screeners = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = true;
    confirmRemoveId = null;
    @track isSaving = false;
    hasLoadedInitialData = false;
    pendingSuccessMessage = null;

    wizardStep = 0;
    wizardMode = 'add';
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardFilter = 'name';
    wizardSearch = '';
    hydratedFromServer = false;
    wiredCaseDataResult;

    @api
    set data(value) {
        this.screeners = Array.isArray(value) ? cloneList(value) : [];
        if (this.screeners.length) {
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
        }
        // Debug: track incoming data length
        // eslint-disable-next-line no-console
        console.error(`[gpCaseStepScreeners] set data len=${this.screeners.length} caseId=${this.caseId} recordId=${this.recordId}`);
    }

    get data() {
        return cloneList(this.screeners);
    }

    get screenersCount() {
        return this.screeners.length;
    }

    get screenersCountDisplay() {
        return this.screenersCount > 10 ? '10+' : this.screenersCount;
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
            return `Screeners for Parent Case (${this.screenersCount})`;
        default:
            return `Screeners (${this.screenersCountDisplay})`;
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

    get readOnlyNotes() {
        return this.isGridView;
    }

    notePreview(value) {
        if (!value) {
            return '';
        }
        const str = value.toString();
        return str.length > 255 ? `${str.slice(0, 255)}…` : str;
    }

    buildPatientScreenerLink(recordId) {
        if (!recordId || typeof recordId !== 'string') {
            return null;
        }
        const trimmed = recordId.trim();
        if (trimmed.length === 15 || trimmed.length === 18) {
            return `/lightning/r/Patient_Screener__c/${trimmed}/view`;
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
    wiredCaseData(result) {
        this.wiredCaseDataResult = result;
        const { data, error } = result || {};
        if (data && this.isStandaloneLayout) {
            const scr = Array.isArray(data.screeners) ? data.screeners : [];
            this.screeners = cloneList(scr);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepScreeners] refreshed via wire len=${this.screeners.length}`);
        } else if (data && !this.hydratedFromServer && !this.screeners.length) {
            const scr = Array.isArray(data.screeners) ? data.screeners : [];
            this.screeners = cloneList(scr);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepScreeners] hydrated via wire len=${this.screeners.length}`);
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading screeners', error);
        }
    }

    @wire(getScreenerCatalog, { caseType: '$catalogCaseType' })
    wiredScreenerCatalog({ data, error }) {
        if (data && Array.isArray(data) && data.length) {
            this.catalog = data.map(item => ({
                id: item.id,
                name: item.name,
                type: item.type || '',
                notes: item.otherNotes || '',
                positiveOutcome: item.positiveOutcome || ''
            }));
            const index = {};
            this.catalog.forEach(item => {
                index[item.id] = item;
            });
            this.catalogIndex = index;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading screener catalog', error);
        }
    }

    get isGridView() {
        return this.screenerMode === 'grid';
    }

    get isWizardView() {
        return this.screenerMode === 'wizard';
    }

    get isRelatedCase() {
        return this.effectiveLayoutContext === 'relatedcase';
    }

    get showAddButton() {
        return this.isGridView;
    }

    get showFilters() {
        return !this.isStandaloneLayout;
    }

    get hasScreeners() {
        return this.screeners.length > 0;
    }

    get filterOptions() {
        return [
            { label: 'Name', value: 'name' },
            { label: 'Type', value: 'type' },
            { label: 'Score', value: 'score' }
        ];
    }

    get filteredScreeners() {
        const term = (this.searchValue || '').toLowerCase();
        return this.screeners
            .map(item => ({
                ...item,
                meta: this.catalogIndex[item.catalogId || item.id] || {
                    name: item.catalogName || item.meta?.name || item.id,
                    type: item.catalogType || item.meta?.type || ''
                },
                recordName: item.recordName || item.name || null,
                recordLink: this.buildPatientScreenerLink(item.recordId),
                cardClass: item.positive ? 'scr-card positive-flag' : 'scr-card',
                showConfirm: this.confirmRemoveId === item.id,
                previewNotes: this.notePreview(item.notes)
            }))
            .filter(item => {
                if (!term) return true;
                if (this.filterBy === 'type') {
                    return (item.meta.type || '').toLowerCase().includes(term);
                }
                if (this.filterBy === 'score') {
                    return (item.score || '').toLowerCase().includes(term);
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

    handleCardNoteChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const value = event.target.value;
        this.screeners = this.screeners.map(scr =>
            scr.id === id ? { ...scr, notes: value } : scr
        );
        this.emitDraftChange();
    }

    handleAddScreeners() {
        this.setScreenerMode('wizard');
        this.wizardMode = 'add';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleEditScreenersWizard(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const current = (this.screeners || [])
            .map(scr => {
                const id = scr?.id || scr?.catalogName || scr?.meta?.name;
                return id ? { ...scr, id } : null;
            })
            .filter(Boolean);
        if (!current.length) {
            this.handleAddScreeners();
            return;
        }
        this.setScreenerMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = current.map(scr => scr.catalogId || scr.id);
        this.wizardDraft = current.map(scr => {
            const meta = this.catalogIndex[scr.catalogId || scr.id] || {
                name: scr.catalogName || scr.id,
                type: scr.catalogType || ''
            };
            return {
                id: scr.id,
                catalogId: scr.catalogId || scr.id,
                meta,
                catalogName: scr.catalogName || meta.name || scr.id,
                catalogType: scr.catalogType || meta.type || '',
                date: scr.date || '',
                score: scr.score || '',
                positive: scr.positive === undefined ? false : scr.positive,
                notes: scr.notes || ''
            };
        });
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleEditScreener(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.screeners.find(scr => scr.id === id);
        if (!existing) return;
        const catalogId = existing.catalogId || existing.id;
        this.setScreenerMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = [catalogId];
        this.wizardDraft = [{
            id: existing.id,
            catalogId,
            meta: this.catalogIndex[catalogId] || { name: existing.catalogName || existing.id, type: existing.catalogType || '' },
            date: existing.date || '',
            score: existing.score || '',
            positive: !!existing.positive,
            notes: existing.notes || ''
        }];
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleRemoveScreener(event) {
        this.confirmRemoveId = event.currentTarget.dataset.id;
    }

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.screeners = this.screeners.filter(scr => scr.id !== id);
        this.confirmRemoveId = null;
        this.pendingSuccessMessage = 'Screener was removed.';
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    get wizardStepLabel() {
        if (this.wizardStep === 0) return 'Pick screeners';
        if (this.wizardStep === 1) return 'Enter details';
        return 'Review';
    }

    get wizardStepIsPick() {
        return this.wizardStep === 0 && this.wizardMode === 'add';
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
            return this.wizardSelection.length === 0 && this.wizardMode === 'add';
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

    getInlineDotClass(stepIndex) {
        return this.wizardStep >= stepIndex ? 'inline-dot active' : 'inline-dot';
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.screeners.map(scr => scr.catalogId || scr.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return this.catalog
            .filter(item => {
                if (!term) return true;
                if (this.wizardFilter === 'type') {
                    return (item.type || '').toLowerCase().includes(term);
                }
                if (this.wizardFilter === 'notes') {
                    return (item.notes || '').toLowerCase().includes(term);
                }
                return (item.name || '').toLowerCase().includes(term);
            })
            .map(item => {
                const disabled = existingIds.has(item.id) && this.wizardMode === 'add';
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

    handleSelectAllFiltered() {
        const selectable = this.wizardCatalogItems
            .filter(item => !item.disabled)
            .map(item => item.id);
        this.wizardSelection = Array.from(new Set([...this.wizardSelection, ...selectable]));
    }

    handleClearSelection() {
        this.wizardSelection = [];
    }

    handleWizardFilterChange(event) {
        this.wizardFilter = event.target.value;
    }

    handleWizardSearchChange(event) {
        this.wizardSearch = event.target.value;
    }

    handleWizardSelectionToggle(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        if (this.wizardMode === 'add') {
            const existingIds = new Set(this.screeners.map(scr => scr.catalogId || scr.id));
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

    wizardNext() {
        if (this.wizardStep === 0) {
            const draftById = new Map(this.wizardDraft.map(item => [item.id, item]));
            const scrById = new Map((this.screeners || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            this.wizardDraft = this.wizardSelection.map(id => {
                const existing = draftById.get(id) || scrById.get(id);
                return {
                    id: existing?.id || id,
                    catalogId: existing?.catalogId || id,
                    meta: existing?.meta || this.catalogIndex[id],
                    date: existing?.date || '',
                    score: existing?.score || '',
                    positive: existing?.positive ?? false,
                    notes: existing?.notes || ''
                };
            });
            this.wizardStep = 1;
            return;
        }
        if (this.wizardStep === 1) {
            if (this.wizardDraft.length === 0) {
                return;
            }
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
        this.setScreenerMode('grid');
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardStep = 0;
        this.wizardMode = 'add';
    }

    saveWizardDraft() {
        const draft = this.wizardDraft.map(item => {
            const meta = this.catalogIndex[item.id] || {};
            return {
                id: item.id,
                catalogId: item.catalogId || item.id,
                catalogName: item.catalogName || meta.name || item.meta?.name || item.id,
                catalogType: item.catalogType || meta.type || item.meta?.type || '',
                date: item.date,
                score: item.score,
                positive: item.positive,
                notes: item.notes
            };
        });

        let next = [...this.screeners];
        draft.forEach(entry => {
            const existingIndex = next.findIndex(scr =>
                scr.id === entry.id ||
                scr.catalogId === entry.catalogId ||
                scr.id === entry.catalogId
            );
            if (existingIndex > -1) {
                const existing = next[existingIndex];
                next[existingIndex] = {
                    ...entry,
                    id: existing.id,
                    recordId: existing.recordId
                };
            } else {
                next = [...next, entry];
            }
        });
        this.screeners = next;
        this.emitDraftChange();
        this.cancelWizard();
    }

    handleWizardDetailChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        this.wizardDraft = this.wizardDraft.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
    }

    handleWizardRemoveDraft(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.wizardDraft = this.wizardDraft.filter(item => item.id !== id);
        this.wizardSelection = this.wizardSelection.filter(item => item !== id);
        if (this.wizardDraft.length === 0) {
            this.wizardStep = 0;
            this.wizardMode = 'add';
        }
    }

    handleReviewEditDetails() {
        this.wizardStep = 1;
    }

    handleReviewChangeSelection() {
        this.wizardMode = 'add';
        this.wizardStep = 0;
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = cloneList(this.screeners);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save screeners.', 'error');
            return;
        }
        const payload = this.buildScreenerPayload();
        this.isSaving = true;
        try {
            await saveScreeners({
                caseId: this.effectiveCaseId,
                items: payload
            });
            const message = this.pendingSuccessMessage || 'Screeners saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (this.isStandaloneLayout) {
                this.refreshPageLayout();
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Screeners save error', JSON.parse(JSON.stringify(err)));
            const message = err?.body?.message || err?.message || 'Unexpected error saving screeners (see console)';
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
        const payload = cloneList(this.screeners);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isStandaloneLayout && !this.isSaving) {
            // Auto-save when embedded standalone in a page layout
            this.handleStandaloneSave();
        }
    }

    setScreenerMode(mode) {
        this.screenerMode = mode;
        this.dispatchEvent(new CustomEvent('viewmodechange', {
            detail: { step: STEP_NUMBER, mode }
        }));
    }

    buildScreenerPayload() {
        return cloneList(this.screeners)
            .map(scr => {
                const meta = this.catalogIndex[scr.id] || {};
                const catalogName = scr.catalogName || meta.name || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogName,
                    catalogType: scr.catalogType || meta.type || '',
                    screenedDate: scr.date || null,
                    score: scr.score || null,
                    positive: scr.positive === undefined ? null : scr.positive,
                    notes: scr.notes || null
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