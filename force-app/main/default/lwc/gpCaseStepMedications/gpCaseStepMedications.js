import { LightningElement, api, track } from 'lwc';
import { MEDICATION_ITEMS, MEDICATION_INDEX } from 'c/gpCaseCatalogs';

const STEP_NUMBER = 10;

const ACTION_OPTIONS = [
    'START New Medication',
    'STOP Existing Medication',
    'CHANGE existing: Decrease dose',
    'CHANGE existing: Increase dose',
    'No Med Changes/Recommendations made',
    'Watchful Waiting / Consider specific',
    'Other Medication Changes'
];

const FREQ = [
    'Once Daily',
    'Twice Daily',
    'Three Times Daily',
    'Every 12 Hours',
    'Every 8 Hours',
    'Once Weekly',
    'Once Monthly',
    'As Needed (PRN)',
    'Custom'
];

const UNITS = [
    'mg (milligrams)',
    'g (grams)',
    'mcg (micrograms)',
    'mL (milliliters)',
    'Units (for medications measured in units)',
    'Custom'
];

const ITEMS = MEDICATION_ITEMS;
const ITEM_INDEX = MEDICATION_INDEX;

function cloneMedList(list) {
    return JSON.parse(JSON.stringify(list || []));
}

export default class GpCaseStepMedications extends LightningElement {
    @api caseId;
    @api caseType;

    @track medMode = 'grid';
    @track medications = [];
    @track filterBy = 'title';
    @track searchValue = '';
    showAllNotes = true;
    confirmRemoveId = null;

    wizardStep = 0;
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardMode = 'add';
    editingId = null;
    wizardFilter = 'title';
    wizardSearch = '';

    @api
    set data(value) {
        if (Array.isArray(value)) {
            this.medications = cloneMedList(value);
        } else {
            this.medications = [];
        }
    }

    get data() {
        return cloneMedList(this.medications);
    }

    /* GRID VIEW HELPERS */
    get isGridView() {
        return this.medMode === 'grid';
    }

    get isWizardView() {
        return this.medMode === 'wizard';
    }

    get hasMedications() {
        return this.medications.length > 0;
    }

    get filterOptions() {
        return [
            { label: 'Name', value: 'title' },
            { label: 'Category', value: 'category' },
            { label: 'Action', value: 'action' }
        ];
    }

    get filteredMedications() {
        const term = (this.searchValue || '').toLowerCase();
        return this.medications
            .map(item => ({
                ...item,
                meta: ITEM_INDEX[item.id] || {},
                cardClass: item.allergy ? 'med-card allergy' : 'med-card',
                showConfirm: this.confirmRemoveId === item.id
            }))
            .filter(item => {
                if (!term) return true;
                const filterField = this.filterBy;
                if (filterField === 'category') {
                    return (item.meta.category || '').toLowerCase().includes(term);
                }
                if (filterField === 'action') {
                    return (item.action || '').toLowerCase().includes(term);
                }
                return (item.meta.title || '').toLowerCase().includes(term);
            });
    }

    /* WIZARD HELPERS */
    get wizardStepLabel() {
        if (this.wizardStep === 0) return 'Pick medications';
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
            if (this.wizardDraft.length === 0) {
                return true;
            }
            return !this.wizardDraft.every(item => item.action && (!item.amount || item.unit));
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


    /* EVENT HANDLERS :: GRID */
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
        this.medications = this.medications.map(med =>
            med.id === id ? { ...med, notes: value } : med
        );
        this.emitDraftChange();
    }

    handleAddMedications() {
        this.setMedMode('wizard');
        this.wizardMode = 'add';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardFilter = 'title';
    }

    handleEditMedication(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.medications.find(med => med.id === id);
        if (!existing) return;
        this.setMedMode('wizard');
        this.wizardMode = 'edit';
        this.editingId = id;
        this.wizardSelection = [id];
        this.wizardDraft = [{
            id,
            meta: ITEM_INDEX[id],
            action: existing.action || '',
            frequency: existing.frequency || '',
            amount: existing.amount || '',
            unit: existing.unit || '',
            current: !!existing.current,
            allergy: !!existing.allergy,
            notes: existing.notes || ''
        }];
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'title';
    }

    handleRemoveMedication(event) {
        const id = event.currentTarget.dataset.id;
        this.confirmRemoveId = id;
    }

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.medications = this.medications.filter(med => med.id !== id);
        this.confirmRemoveId = null;
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    /* WIZARD NAVIGATION */
    handleWizardSelectionToggle(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        const exists = this.wizardSelection.includes(id);
        if (exists) {
            this.wizardSelection = this.wizardSelection.filter(item => item !== id);
        } else {
            this.wizardSelection = [...this.wizardSelection, id];
        }
    }

    wizardNext() {
        if (this.wizardStep === 0) {
            this.wizardDraft = this.wizardSelection.map(id => ({
                id,
                meta: ITEM_INDEX[id],
                action: '',
                frequency: '',
                amount: '',
                unit: '',
                current: false,
                allergy: false,
                notes: ''
            }));
            this.wizardStep = 1;
            return;
        }
        if (this.wizardStep === 1) {
            const errors = [];
            this.wizardDraft = this.wizardDraft.map(item => {
                if (!item.action) {
                    errors.push('Action is required');
                }
                if (item.amount && !item.unit) {
                    errors.push('Unit is required when amount is provided');
                }
                return item;
            });
            if (errors.length) {
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
            this.setMedMode('grid');
            this.wizardSelection = [];
            this.wizardDraft = [];
            return;
        }
        this.wizardStep -= 1;
    }

    cancelWizard() {
        this.setMedMode('grid');
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.editingId = null;
        this.wizardStep = 0;
    }

    saveWizardDraft() {
        const draft = this.wizardDraft.map(item => {
            const meta = ITEM_INDEX[item.id] || {};
            return {
                id: item.id,
                catalogName: meta.title || '',
                catalogCategory: meta.category || '',
                action: item.action,
                frequency: item.frequency,
                amount: item.amount,
                unit: item.unit,
                current: item.current,
                allergy: item.allergy,
                notes: item.notes
            };
        });

        let next = [...this.medications];
        draft.forEach(entry => {
            const existingIndex = next.findIndex(med => med.id === entry.id);
            if (existingIndex > -1) {
                next[existingIndex] = entry;
            } else {
                next = [...next, entry];
            }
        });
        this.medications = next;
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
            this.editingId = null;
        }
    }

    /* SHARED ACTIONS */
    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = cloneMedList(this.medications);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    emitDraftChange() {
        const payload = cloneMedList(this.medications);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }

    setMedMode(mode) {
        this.medMode = mode;
        this.dispatchEvent(new CustomEvent('viewmodechange', {
            detail: { step: STEP_NUMBER, mode }
        }));
    }

    /* TEMPLATE HELPERS */
    get catalogItems() {
        return ITEMS;
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.medications.map(med => med.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return ITEMS
            .filter(item => {
                if (!term) return true;
                if (this.wizardFilter === 'category') {
                    return (item.category || '').toLowerCase().includes(term);
                }
                return (item.title || '').toLowerCase().includes(term);
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
        this.wizardSelection = Array.from(new Set(selectable.concat(this.wizardSelection)));
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

    get actionOptions() {
        return ACTION_OPTIONS;
    }

    get frequencyOptions() {
        return FREQ;
    }

    get unitOptions() {
        return UNITS;
    }

    handleReviewEditDetails() {
        this.wizardStep = 1;
    }

    handleReviewChangeSelection() {
        this.wizardMode = 'add';
        this.wizardStep = 0;
    }
}