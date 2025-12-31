import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSupportCatalog from '@salesforce/apex/GPCaseService.getSupportCatalog';
import getPatientSupports from '@salesforce/apex/GPCaseService.getPatientSupports';
import savePatientSupports from '@salesforce/apex/GPCaseService.savePatientSupports';
import { getRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import CASE_RECORDTYPE_DEVNAME from '@salesforce/schema/Case.RecordType.DeveloperName';
import CASE_TYPE_FIELD from '@salesforce/schema/Case.Case_Type__c';

const cloneList = (list = []) => JSON.parse(JSON.stringify(list || []));
const STEP_NUMBER = 16;
const READ_ONLY_LIMIT = 3;

export default class GpCaseStepPatientSupport extends LightningElement {
    @api caseId;
    @api recordId;
    @api layoutMode = false;
    @api caseType;
    _layoutContext = 'auto';

    @track supportMode = 'grid';
    @track supports = [];
    @track filterBy = 'name';
    @track searchValue = '';
    showAllNotes = true;
    showAllCards = false;
    confirmRemoveId = null;
    @track isSaving = false;
    hasLoadedInitialData = false;
    pendingSuccessMessage = null;

    @track catalog = [];
    @track catalogIndex = {};
    @track isCatalogLoading = false;

    @track wizardSelection = [];
    @track wizardDraft = [];
    wizardStep = 0;
    wizardMode = 'add';
    wizardFilter = 'name';
    wizardSearch = '';

    recordTypeDeveloperName;
    caseTypeFromRecord;
    wiredSupportsResult;

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

    get isStandaloneLayout() {
        return this.layoutMode || (!!this.recordId && !this.caseId);
    }

    get effectiveCaseId() {
        return this.caseId || this.recordId || null;
    }

    get surfaceRecordId() {
        return this.recordId || this.caseId || null;
    }

    get isCareNavigation() {
        if (this.recordTypeDeveloperName) {
            const normalized = this.recordTypeDeveloperName.toLowerCase();
            if (normalized === 'care_navigation' || normalized === 'care navigation') {
                return true;
            }
        }
        // Fallback for Care Navigation subcase pages where record type isn't loaded yet.
        return this.effectiveLayoutContext === 'relatedcase';
    }

    get isParentCaseWithControls() {
        const caseType = (this.caseTypeFromRecord || this.caseType || '').toLowerCase();
        const isAllowedType = caseType === 'addiction medicine' || caseType === 'general psychiatry';
        return isAllowedType && this.effectiveLayoutContext === 'case';
    }

    get isAddictionMedicineCase() {
        const caseType = (this.caseTypeFromRecord || this.caseType || '').toLowerCase();
        return caseType === 'addiction medicine' && this.effectiveLayoutContext === 'case';
    }

    get isGeneralPsychiatryCase() {
        const caseType = (this.caseTypeFromRecord || this.caseType || '').toLowerCase();
        return caseType === 'general psychiatry' && this.effectiveLayoutContext === 'case';
    }

    get hideEmptySubtitle() {
        return this.isAddictionMedicineCase || this.isGeneralPsychiatryCase;
    }

    get isReadOnlySurface() {
        return !(this.isCareNavigation || this.isParentCaseWithControls);
    }

    get shouldRender() {
        return this.isCareNavigation
            || this.supports.length > 0
            || this.isAddictionMedicineCase
            || this.isGeneralPsychiatryCase;
    }

    get headerTitle() {
        if (this.effectiveLayoutContext === 'relatedcase') {
            return `Supports for Parent Case (${this.supportsCountDisplay})`;
        }
        return `Supports (${this.supportsCountDisplay})`;
    }

    get headerIconName() {
        return 'utility:people';
    }

    get supportsCount() {
        return this.supports.length;
    }

    get supportsCountDisplay() {
        return this.supportsCount > 10 ? '10+' : this.supportsCount;
    }

    get showNavigation() {
        return !this.isStandaloneLayout && !this.isWizardView;
    }

    get showAddButton() {
        return this.isCareNavigation && this.isGridView;
    }

    get hasSupports() {
        return this.supports.length > 0;
    }

    get showShowMoreToggle() {
        return this.isReadOnlySurface && this.supports.length > READ_ONLY_LIMIT;
    }

    get showGridControls() {
        if (this.isAddictionMedicineCase || this.isGeneralPsychiatryCase) {
            return false;
        }
        return this.isGridView && (this.hasSupports || this.isParentCaseWithControls);
    }

    get visibleSupports() {
        const list = this.supports.map(item => ({
            ...item,
            supportName: item.catalogName || item.name || item.id,
            previewNotes: this.notePreview(item.notes),
            showConfirm: this.confirmRemoveId === item.id
        }));
        if (this.isReadOnlySurface && !this.showAllCards) {
            return list.slice(0, READ_ONLY_LIMIT);
        }
        return list;
    }

    get filteredSupports() {
        const term = (this.searchValue || '').toLowerCase();
        return this.supports
            .map(item => ({
                ...item,
                supportName: item.catalogName || item.name || item.id,
                previewNotes: this.notePreview(item.notes),
                showConfirm: this.confirmRemoveId === item.id
            }))
            .filter(item => {
                if (!term) return true;
                return (item.supportName || '').toLowerCase().includes(term);
            });
    }

    get filterOptions() {
        return [
            { label: 'Name', value: 'name' }
        ];
    }

    get isGridView() {
        return this.supportMode === 'grid';
    }

    get isWizardView() {
        return this.supportMode === 'wizard';
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

    get wizardNextDisabled() {
        if (this.wizardStep === 0) {
            return this.wizardSelection.length === 0 && this.wizardMode === 'add';
        }
        if (this.wizardStep === 1) {
            return this.wizardDraft.length === 0;
        }
        return false;
    }

    get wizardCatalogItems() {
        const term = (this.wizardSearch || '').toLowerCase();
        const existingIds = new Set(this.supports.map(item => item.catalogId || item.id));
        return this.catalog
            .map(item => {
                const disabled = existingIds.has(item.id) && this.wizardMode === 'add';
                const checked = existingIds.has(item.id) || this.wizardSelection.includes(item.id);
                return {
                    ...item,
                    disabled,
                    checked,
                    className: `${disabled ? 'catalog-card disabled' : 'catalog-card'}${checked ? ' selected' : ''}`
                };
            })
            .filter(item => {
                if (!term) return true;
                return (item.name || '').toLowerCase().includes(term);
            });
    }

    get wizardResultCount() {
        return this.wizardCatalogItems.length;
    }

    @wire(getRecord, { recordId: '$surfaceRecordId', fields: [CASE_RECORDTYPE_DEVNAME] })
    wiredCase({ data, error }) {
        if (data) {
            this.recordTypeDeveloperName = data.fields.RecordType?.value?.fields?.DeveloperName?.value || null;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading case record type', error);
        }
    }

    get catalogCaseType() {
        if (this.caseType) {
            return this.caseType;
        }
        return this.caseTypeFromRecord || null;
    }

    @wire(getRecord, { recordId: '$surfaceRecordId', fields: [CASE_TYPE_FIELD] })
    wiredCaseType({ data, error }) {
        if (data) {
            this.caseTypeFromRecord = data.fields.Case_Type__c?.value || null;
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading case type', error);
        }
    }

    @wire(getPatientSupports, { caseId: '$effectiveCaseId' })
    wiredSupports({ data, error }) {
        this.wiredSupportsResult = { data, error };
        if (data) {
            this.supports = Array.isArray(data) ? cloneList(data) : [];
            if (this.supports.length) {
                this.hasLoadedInitialData = true;
            }
        }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading patient supports', error);
        }
    }

    connectedCallback() {
        this.loadCatalog();
    }

    async loadCatalog() {
        this.isCatalogLoading = true;
        try {
            const data = await getSupportCatalog({ caseType: this.catalogCaseType });
            this.catalog = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                category: item.category || ''
            }));
            const index = {};
            this.catalog.forEach(item => {
                index[item.id] = item;
            });
            this.catalogIndex = index;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading support catalog', error);
        } finally {
            this.isCatalogLoading = false;
        }
    }

    notePreview(value) {
        if (!value) {
            return '';
        }
        const str = value.toString();
        return str.length > 255 ? `${str.slice(0, 255)}…` : str;
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

    toggleShowMore() {
        this.showAllCards = !this.showAllCards;
    }

    handleAddSupport() {
        this.setSupportMode('wizard');
        this.wizardMode = 'add';
        this.wizardStep = 0;
        this.wizardSelection = [];
        this.wizardDraft = [];
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleEditSupportWizard() {
        const current = this.supports || [];
        if (!current.length) {
            this.handleAddSupport();
            return;
        }
        this.setSupportMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = current.map(item => item.id);
        this.wizardDraft = current.map(item => {
            const meta = this.catalogIndex[item.id] || { name: item.catalogName || item.name || item.id };
            return {
                id: item.id,
                meta,
                notes: item.notes || '',
                scheduled: !!item.scheduled,
                going: !!item.going,
                appointmentCompleted: !!item.appointmentCompleted,
                appointmentCompletedIneffective: !!item.appointmentCompletedIneffective,
                suspended: !!item.suspended,
                careNotApplicable: !!item.careNotApplicable
            };
        });
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleEditSupport(event) {
        const id = event.currentTarget.dataset.id;
        const found = this.supports.find(item => item.id === id);
        if (!found) return;
        this.setSupportMode('wizard');
        this.wizardMode = 'edit';
        this.wizardSelection = [id];
        this.wizardDraft = [{
            id,
            meta: this.catalogIndex[id] || { name: found.catalogName || found.name || id },
            notes: found.notes || '',
            scheduled: !!found.scheduled,
            going: !!found.going,
            appointmentCompleted: !!found.appointmentCompleted,
            appointmentCompletedIneffective: !!found.appointmentCompletedIneffective,
            suspended: !!found.suspended,
            careNotApplicable: !!found.careNotApplicable
        }];
        this.wizardStep = 1;
        this.wizardSearch = '';
        this.wizardFilter = 'name';
    }

    handleRemoveSupport(event) {
        const id = event.currentTarget.dataset.id;
        this.confirmRemoveId = id;
    }

    confirmRemove(event) {
        const id = event.currentTarget.dataset.id;
        this.supports = this.supports.filter(item => item.id !== id);
        this.confirmRemoveId = null;
        this.pendingSuccessMessage = 'Patient Support was removed.';
        this.emitDraftChange();
    }

    cancelRemove() {
        this.confirmRemoveId = null;
    }

    handleCardNoteChange(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const value = event.target.value;
        this.supports = this.supports.map(item =>
            item.id === id ? { ...item, notes: value } : item
        );
        this.emitDraftChange();
    }

    handleCardFlagChange(event) {
        const id = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.checked;
        if (!id || !field) return;
        this.supports = this.supports.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        this.emitDraftChange();
    }

    handleWizardFilterChange(event) {
        this.wizardFilter = event.target.value;
    }

    handleWizardSearchChange(event) {
        this.wizardSearch = event.target.value;
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

    handleWizardSelectionToggle(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        if (this.wizardMode === 'add') {
            const existingIds = new Set(this.supports.map(item => item.id));
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
            const supportById = new Map((this.supports || []).map(item => {
                const key = item.catalogId || item.id;
                return [key, item];
            }));
            this.wizardDraft = this.wizardSelection.map(id => {
                const existing = draftById.get(id) || supportById.get(id);
                return {
                    id,
                    meta: existing?.meta || this.catalogIndex[id],
                    notes: existing?.notes || '',
                    scheduled: existing?.scheduled ?? false,
                    going: existing?.going ?? false,
                    appointmentCompleted: existing?.appointmentCompleted ?? false,
                    appointmentCompletedIneffective: existing?.appointmentCompletedIneffective ?? false,
                    suspended: existing?.suspended ?? false,
                    careNotApplicable: existing?.careNotApplicable ?? false
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
        this.setSupportMode('grid');
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
                notes: item.notes,
                scheduled: !!item.scheduled,
                going: !!item.going,
                appointmentCompleted: !!item.appointmentCompleted,
                appointmentCompletedIneffective: !!item.appointmentCompletedIneffective,
                suspended: !!item.suspended,
                careNotApplicable: !!item.careNotApplicable
            };
        });

        let next = [...this.supports];
        draft.forEach(entry => {
            const existingIndex = next.findIndex(item => item.id === entry.id);
            if (existingIndex > -1) {
                next[existingIndex] = entry;
            } else {
                next = [...next, entry];
            }
        });
        this.supports = next;
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
        const payload = cloneList(this.supports);
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    async handleStandaloneSave() {
        if (!this.effectiveCaseId) {
            this.showToast('Error', 'Case Id is required to save patient support.', 'error');
            return;
        }
        const payload = this.buildSupportPayload();
        this.isSaving = true;
        try {
            await savePatientSupports({
                caseId: this.effectiveCaseId,
                items: payload
            });
            const message = this.pendingSuccessMessage || 'Patient Support saved.';
            this.pendingSuccessMessage = null;
            this.showToast('Success', message, 'success');
            if (!this.showNavigation) {
                this.refreshPageLayout();
            }
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error saving patient support';
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
        if (this.wiredSupportsResult) {
            refreshApex(this.wiredSupportsResult);
        }
    }

    emitDraftChange() {
        const payload = cloneList(this.supports);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
        if (this.isReadOnlySurface) {
            return;
        }
        if (!this.showNavigation && !this.isSaving) {
            this.handleStandaloneSave();
        }
    }

    setSupportMode(mode) {
        this.supportMode = mode;
        this.dispatchEvent(new CustomEvent('viewmodechange', {
            detail: { step: STEP_NUMBER, mode }
        }));
    }

    buildSupportPayload() {
        return cloneList(this.supports)
            .map(item => {
                const meta = this.catalogIndex[item.id] || {};
                const supportName = item.catalogName || meta.name || '';
                if (!item.id && !supportName) {
                    return null;
                }
                return {
                    supportId: item.id || null,
                    supportName: supportName || null,
                    notes: item.notes || null,
                    scheduled: item.scheduled === undefined ? null : item.scheduled,
                    going: item.going === undefined ? null : item.going,
                    appointmentCompleted: item.appointmentCompleted === undefined ? null : item.appointmentCompleted,
                    appointmentCompletedIneffective: item.appointmentCompletedIneffective === undefined ? null : item.appointmentCompletedIneffective,
                    suspended: item.suspended === undefined ? null : item.suspended,
                    careNotApplicable: item.careNotApplicable === undefined ? null : item.careNotApplicable
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