import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import getMedicationCatalog from '@salesforce/apex/GPCaseService.getMedicationCatalog';
import saveMedications from '@salesforce/apex/GPCaseService.saveMedications';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';

const STEP_NUMBER = 10;

const FILTER_OPTIONS = [
    { label: 'Name', value: 'title' },
    { label: 'Category', value: 'category' },
    { label: 'Action', value: 'action' }
];

const WIZARD_FILTER_OPTIONS = [
    { label: 'Name', value: 'title' },
    { label: 'Category', value: 'category' }
];

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


function cloneMedList(list) {
    return JSON.parse(JSON.stringify(list || []));
}

export default class GpCaseStepMedications extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;
    _layoutContext = 'auto'; // auto | case | relatedcase
    caseTypeFromRecord;

    @track catalog = [];
    @track catalogIndex = {};

    @track medMode = 'grid';
    @track medications = [];
    @track filterBy = 'title';
    @track searchValue = '';
    showAllNotes = true;
    confirmRemoveId = null;
    @track isSaving = false;
    hasLoadedInitialData = false;
    pendingSuccessMessage = null;

    wizardStep = 0;
    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardMode = 'add';
    editingId = null;
    wizardFilter = 'title';
    wizardSearch = '';
    hydratedFromServer = false;
    wiredCaseDataResult;

    @api
    set data(value) {
        if (Array.isArray(value)) {
            this.medications = cloneMedList(value);
        } else {
            this.medications = [];
        }
        if (this.medications.length) {
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
        }
        // Debug: track incoming data length
        // eslint-disable-next-line no-console
        console.error(`[gpCaseStepMedications] set data len=${this.medications.length} caseId=${this.caseId} recordId=${this.recordId}`);
    }

    get data() {
        return cloneMedList(this.medications);
    }

    get medicationsCount() {
        return this.medications.length;
    }

    get medicationsCountDisplay() {
        return this.medicationsCount > 10 ? '10+' : this.medicationsCount;
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
            return `Medications for Parent Case (${this.medicationsCount})`;
        default:
            return `Medications (${this.medicationsCountDisplay})`;
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

    get showFilters() {
        return !this.isStandaloneLayout;
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

    buildPatientMedicationLink(recordId) {
        if (!recordId || typeof recordId !== 'string') {
            return null;
        }
        const trimmed = recordId.trim();
        if (trimmed.length === 15 || trimmed.length === 18) {
            return `/lightning/r/Patient_Medication__c/${trimmed}/view`;
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
            const meds = Array.isArray(data.medications) ? data.medications : [];
            this.medications = cloneMedList(meds);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepMedications] refreshed via wire len=${this.medications.length}`);
        } else if (data && !this.hydratedFromServer && !this.medications.length) {
            const meds = Array.isArray(data.medications) ? data.medications : [];
            this.medications = cloneMedList(meds);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepMedications] hydrated via wire len=${this.medications.length}`);
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading medications', error);
        }
    }

    @wire(getMedicationCatalog, { caseType: '$catalogCaseType' })
    wiredMedicationCatalog({ data, error }) {
        if (data && Array.isArray(data) && data.length) {
            this.catalog = data.map(item => ({
                id: item.id,
                title: item.name,
                category: item.category || '',
                description: item.description || '',
                brand: item.brand || ''
            }));
            const index = {};
            this.catalog.forEach(item => {
                index[item.id] = item;
            });
            this.catalogIndex = index;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading medication catalog', error);
        }
    }

    /* GRID VIEW HELPERS */
    get isGridView() {
        return this.medMode === 'grid';
    }

    get isWizardView() {
        return this.medMode === 'wizard';
    }

    get isRelatedCase() {
        return this.effectiveLayoutContext === 'relatedcase';
    }

    get showMedicationId() {
        return this.effectiveLayoutContext === 'relatedcase' || this.effectiveLayoutContext === 'case';
    }

    get hasMedications() {
        return this.medications.length > 0;
    }

    get filteredMedications() {
        const term = (this.searchValue || '').toLowerCase();
        return this.medications
            .map(item => {
                const isAllergy = item.allergy;
                const isCurrent = item.current;
                const flags = [];
                if (isAllergy) flags.push('allergy');
                if (isCurrent) flags.push('current');
                const cardClass = flags.length ? `med-card ${flags.join(' ')}` : 'med-card';

                return {
                ...item,
                meta: this.catalogIndex[item.id] || {
                    title: item.catalogName || item.meta?.title || item.id,
                    category: item.catalogCategory || item.meta?.category || ''
                },
                recordName: item.recordName || item.name || null,
                recordLink: this.buildPatientMedicationLink(item.recordId),
                cardClass,
                showConfirm: this.confirmRemoveId === item.id,
                previewNotes: this.notePreview(item.notes)
                };
            })
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

    handleEditMedicationsWizard(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const current = (this.medications || [])
            .map(med => {
                const id = med?.id || med?.catalogName || med?.meta?.title;
                const catalogId = med?.catalogId || med?.catalogName || med?.meta?.title || id;
                return id ? { ...med, id, catalogId } : null;
            })
            .filter(Boolean);
        if (!current.length) {
            this.handleAddMedications();
            return;
        }
        this.setMedMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = current.map(med => med.catalogId || med.id);
        this.wizardDraft = this.decorateWizardDraft(current.map(med => {
            const catalogId = med.catalogId || med.id;
            const meta = this.catalogIndex[catalogId] || {
                title: med.catalogName || catalogId,
                category: med.catalogCategory || ''
            };
            return {
                id: med.id,
                catalogId,
                meta,
                catalogName: med.catalogName || meta.title || catalogId,
                catalogCategory: med.catalogCategory || meta.category || '',
                action: med.action || '',
                frequency: med.frequency || '',
                amount: med.amount || '',
                unit: med.unit || '',
                current: med.current === undefined ? false : med.current,
                allergy: med.allergy === undefined ? false : med.allergy,
                notes: med.notes || ''
            };
        }));
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'title';
        this.editingId = null;
    }

    handleEditMedication(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.medications.find(med => med.id === id);
        if (!existing) return;
        const catalogId = existing.catalogId || existing.catalogName || existing.meta?.title || id;
        this.setMedMode('wizard');
        this.wizardMode = 'edit';
        this.editingId = id;
        this.wizardSelection = [catalogId];
        this.wizardDraft = this.decorateWizardDraft([{
            id,
            catalogId,
            meta: this.catalogIndex[catalogId],
            action: existing.action || '',
            frequency: existing.frequency || '',
            amount: existing.amount || '',
            unit: existing.unit || '',
            current: !!existing.current,
            allergy: !!existing.allergy,
            notes: existing.notes || ''
        }]);
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
        this.pendingSuccessMessage = 'Medication was removed.';
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    /* WIZARD NAVIGATION */
    handleWizardSelectionToggle(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        if (this.wizardMode === 'add') {
            const existingIds = new Set(this.medications.map(med => med.catalogId || med.id));
            if (existingIds.has(id)) {
                return;
            }
        }
        const exists = this.wizardSelection.includes(id);
        if (exists) {
            this.wizardSelection = this.wizardSelection.filter(item => item !== id);
        } else {
            this.wizardSelection = [...this.wizardSelection, id];
        }
    }

    wizardNext() {
        if (this.wizardStep === 0) {
            const draftById = new Map(this.wizardDraft.map(item => [item.catalogId || item.id, item]));
            const medsById = new Map((this.medications || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            const draft = this.wizardSelection.map(id => {
                const existing = draftById.get(id) || medsById.get(id);
                return {
                    id: existing?.id || id,
                    catalogId: existing?.catalogId || id,
                    meta: existing?.meta || this.catalogIndex[id],
                    action: existing?.action || '',
                    frequency: existing?.frequency || '',
                    amount: existing?.amount || '',
                    unit: existing?.unit || '',
                    current: existing?.current ?? false,
                    allergy: existing?.allergy ?? false,
                    notes: existing?.notes || ''
                };
            });
            this.wizardDraft = this.decorateWizardDraft(draft);
            this.wizardStep = 1;
            return;
        }
        if (this.wizardStep === 1) {
            let hasError = false;
            let firstMissingActionId = null;
            const updated = this.wizardDraft.map(item => {
                let actionError = false;
                let unitError = false;
                const normalizedAction = (item.action || '').trim();
                if (!normalizedAction || normalizedAction === 'Select action') {
                    actionError = true;
                    hasError = true;
                    if (!firstMissingActionId) {
                        firstMissingActionId = item.id;
                    }
                    this.setActionValidity(item.id, 'Select the Action');
                } else {
                    this.setActionValidity(item.id, '');
                }
                if (item.amount && !item.unit) {
                    unitError = true;
                    hasError = true;
                }
                return { ...item, actionError, unitError, actionClass: actionError ? 'text-input input-error' : 'text-input' };
            });
            this.wizardDraft = this.decorateWizardDraft(updated);
            this.wizardDraft = [...this.wizardDraft]; // force rerender for error state
            if (hasError) {
                if (firstMissingActionId) {
                    setTimeout(() => {
                        this.setActionValidity(firstMissingActionId, 'Select the Action');
                        this.focusActionDropdown(firstMissingActionId, true);
                    }, 0);
                }
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
            const catalogId = item.catalogId || item.id;
            const meta = this.catalogIndex[catalogId] || {};
            return {
                id: item.id,
                catalogId,
                catalogName: item.catalogName || meta.title || item.meta?.title || catalogId,
                catalogCategory: item.catalogCategory || meta.category || item.meta?.category || '',
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
            const existingIndex = next.findIndex(med =>
                med.id === entry.id ||
                med.catalogId === entry.catalogId ||
                med.id === entry.catalogId
            );
            if (existingIndex > -1) {
                const prev = next[existingIndex];
                next[existingIndex] = {
                    ...entry,
                    id: prev.id,
                    recordId: prev.recordId
                };
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
        const value = event.detail && event.detail.value !== undefined
            ? event.detail.value
            : (event.target.type === 'checkbox' ? event.target.checked : event.target.value);
        const updated = this.wizardDraft.map(item => {
            if (item.id !== id) return item;
            const next = { ...item, [field]: value };
            if (field === 'action') {
                const normalized = (value || '').trim();
                if (normalized && normalized !== 'Select action') {
                    next.actionError = false;
                    next.actionClass = 'text-input';
                    this.setActionValidity(id, '');
                    next.action = normalized;
                } else {
                    next.action = '';
                }
            }
            if (field === 'unit' && value) {
                next.unitError = false;
            }
            if (field === 'amount' && !value) {
                next.unitError = false;
            }
            return next;
        });
        this.wizardDraft = this.decorateWizardDraft(updated);
    }

    focusActionDropdown(id, showValidity = false) {
        if (!id) return;
        const el = this.template.querySelector(`lightning-combobox[data-field="action"][data-id="${id}"]`) ||
                   this.template.querySelector(`select[data-field="action"][data-id="${id}"]`);
        if (el) {
            el.focus();
            if (showValidity && el.reportValidity) {
                el.reportValidity();
            }
        }
    }

    setActionValidity(id, message) {
        const el = this.template.querySelector(`lightning-combobox[data-field="action"][data-id="${id}"]`) ||
                   this.template.querySelector(`select[data-field="action"][data-id="${id}"]`);
        if (el && typeof el.setCustomValidity === 'function') {
            el.setCustomValidity(message || '');
            el.reportValidity?.();
        }
    }

    handleWizardRemoveDraft(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        const filtered = this.wizardDraft.filter(item => item.id !== id);
        this.wizardDraft = this.decorateWizardDraft(filtered);
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

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save medications.', 'error');
            return;
        }
        const payload = this.buildMedicationPayload();
        this.isSaving = true;
        try {
            await saveMedications({
                caseId: this.effectiveCaseId,
                items: payload
            });
            const message = this.pendingSuccessMessage || 'Medications saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (this.isStandaloneLayout) {
                this.refreshPageLayout();
            }
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving medications';
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
        const payload = cloneMedList(this.medications);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isStandaloneLayout && !this.isSaving) {
            // Auto-save in standalone layout
            this.handleStandaloneSave();
        }
    }

    setMedMode(mode) {
        this.medMode = mode;
        this.dispatchEvent(new CustomEvent('viewmodechange', {
            detail: { step: STEP_NUMBER, mode }
        }));
    }

    /* TEMPLATE HELPERS */
    get catalogItems() {
        return this.catalog;
    }

    get wizardCatalogItems() {
        const existingIds = new Set(this.medications.map(med => med.catalogId || med.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return this.catalog
            .filter(item => {
                if (!term) return true;
                if (this.wizardFilter === 'category') {
                    return (item.category || '').toLowerCase().includes(term);
                }
                return (item.title || '').toLowerCase().includes(term);
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

    handleReviewEditDetails() {
        this.wizardStep = 1;
    }

    handleReviewChangeSelection() {
        this.wizardMode = 'add';
        this.wizardStep = 0;
    }

    get filterOptionsDecorated() {
        return this.decorateOptionList(FILTER_OPTIONS, this.filterBy);
    }

    get wizardFilterOptions() {
        return this.decorateOptionList(WIZARD_FILTER_OPTIONS, this.wizardFilter);
    }

    decorateWizardDraft(entries = []) {
        return entries.map(entry => this.decorateWizardItem(entry));
    }

    decorateWizardItem(entry) {
        const base = { ...entry };
        const catalogId = base.catalogId || base.id;
        base.meta = base.meta || this.catalogIndex[catalogId] || {};
        base.actionOptionsDecorated = this.decorateOptionList(ACTION_OPTIONS, base.action || '');
        base.frequencyOptionsDecorated = this.decorateOptionList(FREQ, base.frequency || '');
        base.unitOptionsDecorated = this.decorateOptionList(UNITS, base.unit || '');
        base.actionError = !!base.actionError;
        base.unitError = !!base.unitError;
        base.actionClass = base.actionError ? 'text-input input-error' : 'text-input';
        return base;
    }

    decorateOptionList(options, selectedValue) {
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

    buildMedicationPayload() {
        return cloneMedList(this.medications)
            .map(med => {
                const catalogId = med.catalogId || med.id;
                const meta = this.catalogIndex[catalogId] || {};
                const catalogName = med.catalogName || meta.title || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogName,
                    catalogCategory: med.catalogCategory || meta.category || '',
                    action: med.action || null,
                    frequency: med.frequency || null,
                    amount: med.amount || null,
                    unit: med.unit || null,
                    current: med.current === undefined ? null : med.current,
                    allergy: med.allergy === undefined ? null : med.allergy,
                    notes: med.notes || null
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