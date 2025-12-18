import { LightningElement, api, track } from 'lwc';
import getPcqtCatalog from '@salesforce/apex/PCQTSelectorController.getPcqtCatalog';
import getPcqtSelections from '@salesforce/apex/PCQTSelectorController.getPcqtSelections';
import savePcqtSelections from '@salesforce/apex/PCQTSelectorController.savePcqtSelections';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PcqtSelector extends LightningElement {
    @api recordId;
    @api authoritativeCaseId; // optional override (si tu wizard ya resolvió parent)
    @api caseType;
    @api required = false;
    @api disabled = false;
    @api showSaveButtons;

    // Wizard-mode controlled prop:
    _value = [];
    pcqtSearch = '';
    @api
    get value() { return this._value; }
    set value(v) {
        this._value = Array.isArray(v) ? v : [];
        this.selectedIds = [...this._value];
        this.reconcileSelectionWithOptions();
        this.hasInteracted = this.selectedIds.length > 0;
        this.updateErrorState();
        if (this.isWizardMode) this.persistDraft();
    }

    @track options = [];
    @track selectedIds = [];

    @track isLoading = false;
    @track loadError;
    @track showError = false;
    hasInteracted = false;

    get isWizardMode() {
        // Si NO hay recordId, asumimos wizard controlled
        return !this.recordId;
    }

    get showSave() {
        // Solo record page mode guarda desde el componente (se puede ocultar con showSaveButtons)
        return this.showSaveButtons && !this.isWizardMode;
    }

    get computedDisabled() {
        return this.disabled || this.isLoading;
    }

    get selectedCountLabel() {
        const count = Array.isArray(this.selectedIds) ? this.selectedIds.length : 0;
        return `${count} selected`;
    }

    get filteredOptions() {
        const term = (this.pcqtSearch || '').toLowerCase();
        const selected = new Set(this.selectedIds || []);
        return (this.options || [])
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                chipClass: `chip ${selected.has(opt.value) ? 'chip-selected' : ''}`,
                isSelected: selected.has(opt.value)
            }));
    }

    get selectedLabels() {
        const map = this.options.reduce((acc, opt) => {
            acc[opt.value] = opt.label;
            return acc;
        }, {});
        return (this.selectedIds || []).map(id => map[id]).filter(Boolean);
    }

    get hasSelection() {
        return Array.isArray(this.selectedIds) && this.selectedIds.length > 0;
    }

    connectedCallback() {
        this.init();
    }

    async init() {
        this.isLoading = true;
        this.loadError = null;

        try {
            const catalog = await getPcqtCatalog({ caseType: this.caseType });
            this.options = (catalog || []).map(i => ({ label: i.label, value: i.id }));

            // Ajustar selección recibida vs. catálogo (para cuando value trae labels)
            this.reconcileSelectionWithOptions();

            if (this.isWizardMode) {
                this.selectedIds = [...(this._value || [])];
                const stored = this.loadDraft();
                if (stored && stored.length) {
                    this.selectedIds = stored;
                }
                this.reconcileSelectionWithOptions();
            } else {
                // Record page mode: intenta Apex; si falla, conserva value/_value
                if (this.authoritativeCaseId || this.recordId) {
                    const selections = await getPcqtSelections({ recordId: this.authoritativeCaseId || this.recordId });
                    const apexIds = Array.isArray(selections) ? selections : [];
                    // Si Apex devuelve vacío, recurre al value/_value para mostrar lo que venga desde el host
                    this.selectedIds = apexIds.length ? apexIds : [...(this._value || [])];
                } else {
                    this.selectedIds = [...(this._value || [])];
                }
                this.reconcileSelectionWithOptions();
            }
            this.hasInteracted = this.selectedIds.length > 0;
            this.updateErrorState();
        } catch (e) {
            this.loadError = this.normalizeError(e);
        } finally {
            this.isLoading = false;
        }
    }

    reconcileSelectionWithOptions() {
        if (!Array.isArray(this.options) || !this.options.length) return;
        if (!Array.isArray(this.selectedIds) || !this.selectedIds.length) return;

        const values = new Set(this.options.map(opt => opt.value));
        const labelToId = this.options.reduce((acc, opt) => {
            acc[opt.label.toLowerCase()] = opt.value;
            return acc;
        }, {});

        const resolved = [];
        this.selectedIds.forEach(val => {
            if (values.has(val)) {
                resolved.push(val);
                return;
            }
            const match = labelToId[(val || '').toString().toLowerCase()];
            if (match) resolved.push(match);
        });

        if (resolved.length) {
            this.selectedIds = Array.from(new Set(resolved));
        }
    }

    handleUiChange(evt) {
        const ids = evt.detail.value; // dual-listbox
        this.selectedIds = Array.isArray(ids) ? ids : [];

        this.emitChange();
    }

    async handleSave() {
        this.isLoading = true;
        try {
            const res = await savePcqtSelections({
                recordId: this.authoritativeCaseId || this.recordId,
                selectionIds: this.selectedIds
            });

            this.dispatchEvent(new ShowToastEvent({
                title: 'Saved',
                message: `PCQT selections updated. (+${res.insertedCount} / -${res.deletedCount})`,
                variant: 'success'
            }));

            this.dispatchEvent(new CustomEvent('pcqtchange', {
                detail: { authoritativeCaseId: res.authoritativeCaseId }
            }));
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: this.normalizeError(e),
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    handleSearch(event) {
        this.pcqtSearch = event.target.value || '';
    }

    handleToggle(event) {
        const id = event.currentTarget.dataset.id;
        if (!id || this.computedDisabled) return;
        const set = new Set(this.selectedIds || []);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        this.selectedIds = Array.from(set);
        this.hasInteracted = true;
        this.emitChange();
    }

    emitChange() {
        const selectedLabels = this.selectedLabels;
        // Notifica siempre al host (wizard o record page) para que refleje cambios
        this.dispatchEvent(new CustomEvent('change', {
            detail: { selectedIds: this.selectedIds, selectedLabels }
        }));
        this.updateErrorState();
        this.persistDraft();
    }

    updateErrorState() {
        this.showError = this.required && this.hasInteracted && !this.hasSelection;
    }

    persistDraft() {
        try {
            if (!this.isWizardMode) return;
            const key = this.getDraftKey();
            if (!key) return;
            window.localStorage.setItem(key, JSON.stringify(this.selectedIds || []));
        } catch (e) {
            // swallow storage issues
        }
    }

    loadDraft() {
        try {
            if (!this.isWizardMode) return [];
            const key = this.getDraftKey();
            if (!key) return [];
            const raw = window.localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    getDraftKey() {
        const suffix = this.caseType ? this.caseType.toLowerCase() : 'wizard';
        return `pcqtSelectorDraft:${suffix}`;
    }

    normalizeError(e) {
        try {
            if (e?.body?.message) return e.body.message;
            if (Array.isArray(e?.body)) return e.body.map(x => x.message).join(', ');
            return e?.message || JSON.stringify(e);
        } catch {
            return 'Unknown error';
        }
    }
}