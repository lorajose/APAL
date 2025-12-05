import { LightningElement, api, track } from 'lwc';
import { SUBSTANCE_ITEMS as SUBSTANCE_CATALOG, SUBSTANCE_INDEX as SUBSTANCE_LOOKUP } from 'c/gpCaseCatalogs';

const FILTER_OPTIONS = [
    { label: 'Name', value: 'name' },
    { label: 'Category', value: 'category' },
    { label: 'Frequency', value: 'frequency' }
];

const WIZARD_FILTER_OPTIONS = [
    { label: 'Name', value: 'name' },
    { label: 'Category', value: 'category' },
    { label: 'Description', value: 'description' }
];

const FREQUENCY_OPTIONS = [
    'Multiple times a day',
    'Daily',
    'Weekly',
    'Monthly',
    'Occasionally',
    'Rarely'
];

const SUBSTANCES = SUBSTANCE_CATALOG;
const SUBSTANCE_INDEX = SUBSTANCE_LOOKUP;

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const STEP_NUMBER = 11;

export default class GpCaseStepSubstances extends LightningElement {
    @api caseId;
    @api caseType;

    @track subMode = 'grid';
    @track substances = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = true;
    confirmRemoveId = null;

    wizardStep = 0;
    wizardMode = 'add';
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardFilter = 'name';
    wizardSearch = '';

    @api
    set data(value) {
        this.substances = Array.isArray(value) ? cloneList(value) : [];
    }

    get data() {
        return cloneList(this.substances);
    }

    /* VIEW STATES */
    get isGridView() {
        return this.subMode === 'grid';
    }

    get isWizardView() {
        return this.subMode === 'wizard';
    }

    get hasSubstances() {
        return this.substances.length > 0;
    }

    get filteredSubstances() {
        const term = (this.searchValue || '').toLowerCase();
        return this.substances
            .map(item => ({
                ...item,
                meta: SUBSTANCE_INDEX[item.id] || {},
                cardClass: item.current ? 'sub-card current' : 'sub-card',
                showConfirm: this.confirmRemoveId === item.id
            }))
            .filter(item => {
                if (!term) return true;
                if (this.filterBy === 'category') {
                    return (item.meta.category || '').toLowerCase().includes(term);
                }
                if (this.filterBy === 'frequency') {
                    return (item.frequency || '').toLowerCase().includes(term);
                }
                    return (item.meta.name || '').toLowerCase().includes(term);
            });
    }

    /* GRID ACTIONS */
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
        this.substances = this.substances.map(sub =>
            sub.id === id ? { ...sub, notes: value } : sub
        );
        this.emitDraftChange();
    }

    handleAddSubstances() {
        this.setSubMode('wizard');
        this.wizardMode = 'add';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleEditSubstance(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.substances.find(sub => sub.id === id);
        if (!existing) return;
        this.setSubMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = [id];
        this.wizardDraft = this.decorateWizardDraft([{
            id,
            meta: SUBSTANCE_INDEX[id],
            frequency: existing.frequency || '',
            current: !!existing.current,
            notes: existing.notes || ''
        }]);
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleRemoveSubstance(event) {
        this.confirmRemoveId = event.currentTarget.dataset.id;
    }

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.substances = this.substances.filter(sub => sub.id !== id);
        this.confirmRemoveId = null;
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    /* WIZARD HELPERS */
    get wizardStepLabel() {
        if (this.wizardStep === 0) return 'Pick substances';
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
        const existingIds = new Set(this.substances.map(sub => sub.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return SUBSTANCES
            .filter(item => {
                if (!term) return true;
                if (this.wizardFilter === 'category') {
                    return (item.category || '').toLowerCase().includes(term);
                }
                if (this.wizardFilter === 'description') {
                    return (item.description || '').toLowerCase().includes(term);
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
            this.wizardDraft = this.decorateWizardDraft(this.wizardSelection.map(id => ({
                id,
                meta: SUBSTANCE_INDEX[id],
                frequency: '',
                current: false,
                notes: ''
            })));
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
        this.setSubMode('grid');
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardStep = 0;
        this.wizardMode = 'add';
    }

    saveWizardDraft() {
        const draft = this.wizardDraft.map(item => {
            const meta = SUBSTANCE_INDEX[item.id] || {};
            return {
                id: item.id,
                catalogName: meta.name || '',
                catalogCategory: meta.category || '',
                frequency: item.frequency,
                current: item.current,
                notes: item.notes
            };
        });

        let next = [...this.substances];
        draft.forEach(entry => {
            const existingIndex = next.findIndex(sub => sub.id === entry.id);
            if (existingIndex > -1) {
                next[existingIndex] = entry;
            } else {
                next = [...next, entry];
            }
        });
        this.substances = next;
        this.emitDraftChange();
        this.cancelWizard();
    }

    handleWizardDetailChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        this.wizardDraft = this.decorateWizardDraft(this.wizardDraft.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    }

    handleWizardRemoveDraft(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.wizardDraft = this.decorateWizardDraft(this.wizardDraft.filter(item => item.id !== id));
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

    /* ACTIONS */
    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = cloneList(this.substances);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    emitDraftChange() {
        const payload = cloneList(this.substances);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }

    setSubMode(mode) {
        this.subMode = mode;
        this.dispatchEvent(new CustomEvent('viewmodechange', {
            detail: { step: STEP_NUMBER, mode }
        }));
    }

    get filterOptionsDecorated() {
        return this.decorateOptionList(FILTER_OPTIONS, this.filterBy);
    }

    get wizardFilterOptionsDecorated() {
        return this.decorateOptionList(WIZARD_FILTER_OPTIONS, this.wizardFilter);
    }

    decorateWizardDraft(entries = []) {
        return (entries || []).map(entry => this.decorateWizardItem(entry));
    }

    decorateWizardItem(entry = {}) {
        const base = { ...entry };
        base.meta = base.meta || SUBSTANCE_INDEX[base.id] || {};
        base.frequencyBlankSelected = !base.frequency;
        base.frequencyOptionsDecorated = this.decorateOptionList(FREQUENCY_OPTIONS, base.frequency || '');
        return base;
    }

    decorateOptionList(options = [], selectedValue) {
        return (options || []).map(option => {
            const normalized = typeof option === 'string'
                ? { label: option, value: option }
                : { label: option.label, value: option.value };
            return {
                ...normalized,
                selected: normalized.value === selectedValue
            };
        });
    }
}