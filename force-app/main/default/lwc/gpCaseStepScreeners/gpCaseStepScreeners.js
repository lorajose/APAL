import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import saveScreeners from '@salesforce/apex/GPCaseService.saveScreeners';
import { SCREENER_ITEMS as SCREENER_CATALOG, SCREENER_INDEX as SCREENER_LOOKUP } from 'c/gpCaseCatalogs';

const SCREENERS = SCREENER_CATALOG;
const SCREENER_INDEX = SCREENER_LOOKUP;

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const STEP_NUMBER = 12;

export default class GpCaseStepScreeners extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;

    @track screenerMode = 'grid';
    @track screeners = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = true;
    confirmRemoveId = null;
    @track isSaving = false;
    hasLoadedInitialData = false;

    wizardStep = 0;
    wizardMode = 'add';
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardFilter = 'name';
    wizardSearch = '';
    hydratedFromServer = false;

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

    get effectiveCaseId() {
        return this.caseId || this.recordId || null;
    }

    get isStandaloneLayout() {
        return this.layoutMode || (!!this.recordId && !this.caseId);
    }

    get showNavigation() {
        return !this.isStandaloneLayout;
    }

    get wireCaseId() {
        return this.caseId || this.recordId || null;
    }

    @wire(getCaseFullData, { caseId: '$wireCaseId' })
    wiredCaseData({ data, error }) {
        if (data && !this.hydratedFromServer && !this.screeners.length) {
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

    get isGridView() {
        return this.screenerMode === 'grid';
    }

    get isWizardView() {
        return this.screenerMode === 'wizard';
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
                meta: SCREENER_INDEX[item.id] || {},
                cardClass: item.positive ? 'scr-card positive-flag' : 'scr-card',
                showConfirm: this.confirmRemoveId === item.id
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
        this.wizardSelection = current.map(scr => scr.id);
        this.wizardDraft = current.map(scr => {
            const meta = SCREENER_INDEX[scr.id] || {
                name: scr.catalogName || scr.id,
                type: scr.catalogType || ''
            };
            return {
                id: scr.id,
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
        this.setScreenerMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = [id];
        this.wizardDraft = [{
            id,
            meta: SCREENER_INDEX[id],
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
        const existingIds = new Set(this.screeners.map(scr => scr.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return SCREENERS
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
                const checked = this.wizardSelection.includes(item.id);
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
        if (this.wizardSelection.includes(id)) {
            this.wizardSelection = this.wizardSelection.filter(sel => sel !== id);
        } else {
            this.wizardSelection = [...this.wizardSelection, id];
        }
    }

    wizardNext() {
        if (this.wizardStep === 0) {
            this.wizardDraft = this.wizardSelection.map(id => ({
                id,
                meta: SCREENER_INDEX[id],
                date: '',
                score: '',
                positive: false,
                notes: ''
            }));
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
            const meta = SCREENER_INDEX[item.id] || {};
            return {
                id: item.id,
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
            const existingIndex = next.findIndex(scr => scr.id === entry.id);
            if (existingIndex > -1) {
                next[existingIndex] = entry;
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
            this.showToast('Success', 'Screeners saved.', 'success');
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving screeners';
            this.showToast('Error', message, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    emitDraftChange() {
        const payload = cloneList(this.screeners);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
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
                const meta = SCREENER_INDEX[scr.id] || {};
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