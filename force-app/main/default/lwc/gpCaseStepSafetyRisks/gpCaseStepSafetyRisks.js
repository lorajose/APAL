import { LightningElement, api, track } from 'lwc';
import { SAFETY_RISK_ITEMS as SAFETY_RISK_CATALOG, SAFETY_RISK_INDEX as SAFETY_RISK_LOOKUP } from 'c/gpCaseCatalogs';

const SAFETY_RISKS = SAFETY_RISK_CATALOG;
const RISK_INDEX = SAFETY_RISK_LOOKUP;

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));

export default class GpCaseStepSafetyRisks extends LightningElement {
    @api caseId;
    @api caseType;

    @track safetyMode = 'grid';
    @track risks = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = false;
    confirmRemoveId = null;

    wizardStep = 0;
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardCategoryFilter = 'all';
    wizardSearch = '';

    @api
    set data(value) {
        this.risks = Array.isArray(value) ? cloneList(value) : [];
    }

    get data() {
        return cloneList(this.risks);
    }

    get isGridView() {
        return this.safetyMode === 'grid';
    }

    get isWizardView() {
        return this.safetyMode === 'wizard';
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
                meta: RISK_INDEX[item.id] || {},
                showConfirm: this.confirmRemoveId === item.id
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

    get wizardCategoryOptions() {
        const categories = Array.from(new Set(SAFETY_RISKS.map(item => item.category)));
        return [{ label: 'All categories', value: 'all' }, ...categories.map(cat => ({ label: cat, value: cat }))];
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.risks.map(risk => risk.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return SAFETY_RISKS
            .filter(item => this.wizardCategoryFilter === 'all' || item.category === this.wizardCategoryFilter)
            .filter(item => {
                if (!term) return true;
                return (item.name || '').toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
            })
            .map(item => {
                const disabled = existingIds.has(item.id);
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
                meta: RISK_INDEX[id],
                recent: false,
                historical: false,
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
            const meta = RISK_INDEX[item.id] || {};
            return {
                id: item.id,
                catalogName: meta.name || '',
                catalogCategory: meta.category || '',
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

    emitDraftChange() {
        const payload = cloneList(this.risks);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }
}