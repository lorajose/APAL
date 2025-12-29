import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import getSubstanceCatalog from '@salesforce/apex/GPCaseService.getSubstanceCatalog';
import saveSubstances from '@salesforce/apex/GPCaseService.saveSubstances';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';

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


const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const STEP_NUMBER = 11;

export default class GpCaseStepSubstances extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;
    _layoutContext = 'auto'; // auto | case | relatedcase

    @track catalog = [];
    @track catalogIndex = {};
    caseTypeFromRecord;

    @track subMode = 'grid';
    @track substances = [];
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
        this.substances = Array.isArray(value) ? cloneList(value) : [];
        if (this.substances.length) {
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
        }
        // Debug: track incoming data length
        // eslint-disable-next-line no-console
        console.error(`[gpCaseStepSubstances] set data len=${this.substances.length} caseId=${this.caseId} recordId=${this.recordId}`);
    }

    get data() {
        return cloneList(this.substances);
    }

    get substancesCount() {
        return this.substances.length;
    }

    get substancesCountDisplay() {
        return this.substancesCount > 10 ? '10+' : this.substancesCount;
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
            return `Substances for Parent Case (${this.substancesCount})`;
        default:
            return `Substances (${this.substancesCountDisplay})`;
        }
    }

    get headerIconName() {
        return 'utility:people';
    }

    get showSubstanceName() {
        return this.effectiveLayoutContext === 'relatedcase';
    }

    buildCatalogLink(catalogId) {
        if (!catalogId || typeof catalogId !== 'string') {
            return null;
        }
        const trimmed = catalogId.trim();
        if (trimmed.length === 15 || trimmed.length === 18) {
            return `/lightning/r/Substance_List__c/${trimmed}/view`;
        }
        return null;
    }

    buildPatientSubstanceLink(recordId) {
        if (!recordId || typeof recordId !== 'string') {
            return null;
        }
        const trimmed = recordId.trim();
        if (trimmed.length === 15 || trimmed.length === 18) {
            return `/lightning/r/Patient_Substance__c/${trimmed}/view`;
        }
        return null;
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
                meta: this.catalogIndex[item.id] || {
                    name: item.catalogName || item.meta?.name || item.id,
                    category: item.catalogCategory || item.meta?.category || ''
                },
                recordName: item.recordName || item.name || null,
                recordLink: this.buildPatientSubstanceLink(item.recordId),
                cardClass: item.current ? 'sub-card current' : 'sub-card',
                showConfirm: this.confirmRemoveId === item.id,
                previewNotes: this.notePreview(item.notes)
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

    handleEditSubstancesWizard(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const current = (this.substances || [])
            .map(sub => {
                const id = sub?.id || sub?.catalogName || sub?.meta?.name;
                return id ? { ...sub, id } : null;
            })
            .filter(Boolean);
        if (!current.length) {
            this.handleAddSubstances();
            return;
        }
        this.setSubMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = current.map(sub => sub.id);
        this.wizardDraft = this.decorateWizardDraft(current.map(sub => {
            const meta = this.catalogIndex[sub.id] || {
                name: sub.catalogName || sub.id,
                category: sub.catalogCategory || ''
            };
            return {
                id: sub.id,
                meta,
                catalogName: sub.catalogName || meta.name || sub.id,
                catalogCategory: sub.catalogCategory || meta.category || '',
                frequency: sub.frequency || '',
                current: sub.current === undefined ? false : sub.current,
                notes: sub.notes || ''
            };
        }));
        this.wizardStep = 1;
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
            meta: this.catalogIndex[id],
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
        this.pendingSuccessMessage = 'Substance was removed.';
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
            const subs = Array.isArray(data.substances) ? data.substances : [];
            this.substances = cloneList(subs);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepSubstances] refreshed via wire len=${this.substances.length}`);
        } else if (data && !this.hydratedFromServer && !this.substances.length) {
            const subs = Array.isArray(data.substances) ? data.substances : [];
            this.substances = cloneList(subs);
            this.hydratedFromServer = true;
            this.hasLoadedInitialData = true;
            // eslint-disable-next-line no-console
            console.error(`[gpCaseStepSubstances] hydrated via wire len=${this.substances.length}`);
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading substances', error);
        }
    }

    @wire(getSubstanceCatalog, { caseType: '$catalogCaseType' })
    wiredSubstanceCatalog({ data, error }) {
        if (data && Array.isArray(data) && data.length) {
            this.catalog = data.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category || '',
                description: item.description || ''
            }));
            const index = {};
            this.catalog.forEach(item => {
                index[item.id] = item;
            });
            this.catalogIndex = index;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading substance catalog', error);
        }
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
        const existingIds = new Set(this.substances.map(sub => sub.catalogId || sub.id));
        const term = (this.wizardSearch || '').toLowerCase();
        return this.catalog
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
            const existingIds = new Set(this.substances.map(sub => sub.catalogId || sub.id));
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
            const subsById = new Map((this.substances || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            this.wizardDraft = this.decorateWizardDraft(this.wizardSelection.map(id => {
                const existing = draftById.get(id) || subsById.get(id);
                return {
                    id,
                    meta: existing?.meta || this.catalogIndex[id],
                    frequency: existing?.frequency || '',
                    current: existing?.current ?? false,
                    notes: existing?.notes || ''
                };
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
        this.setSubMode('grid');
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
                catalogName: item.catalogName || meta.name || item.meta?.name || item.id,
                catalogCategory: item.catalogCategory || meta.category || item.meta?.category || '',
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

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save substances.', 'error');
            return;
        }
        const payload = this.buildSubstancePayload();
        this.isSaving = true;
        try {
            await saveSubstances({
                caseId: this.effectiveCaseId,
                items: payload
            });
            const message = this.pendingSuccessMessage || 'Substances saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (this.isStandaloneLayout) {
                this.refreshPageLayout();
            }
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving substances';
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
        const payload = cloneList(this.substances);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isStandaloneLayout && !this.isSaving) {
            // Auto-save when used standalone in a page layout
            this.handleStandaloneSave();
        }
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
        base.meta = base.meta || this.catalogIndex[base.id] || {};
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

    buildSubstancePayload() {
        return cloneList(this.substances)
            .map(sub => ({
                catalogName: sub.catalogName || (this.catalogIndex[sub.id]?.name || ''),
                catalogCategory: sub.catalogCategory || (this.catalogIndex[sub.id]?.category || ''),
                frequency: sub.frequency || '',
                current: sub.current === undefined ? null : sub.current,
                notes: sub.notes || null
            }))
            .filter(item => item.catalogName);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant: variant || 'info'
        }));
    }
}