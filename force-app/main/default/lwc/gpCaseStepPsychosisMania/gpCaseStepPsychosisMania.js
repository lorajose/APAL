import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import MEDICAL_NOTES_FIELD from '@salesforce/schema/Case.Medical_Notes__c';
import PSYCHOSIS_NOTES_FIELD from '@salesforce/schema/Case.Psychosis_Notes__c';
import getConcernCatalog from '@salesforce/apex/GPCaseService.getConcernCatalog';

const CASE_LINES = {
    GENERAL: 'general',
    ADDICTION: 'addiction'
};

const PSYCHOSIS_CATEGORY = 'Psychosis Symptoms';
const PSYCHOSIS_CASE_TYPE = 'General_Psychiatry';
const MANIA_CATEGORY = 'Mania/Hypomania Symptoms';
const MANIA_CASE_TYPE = 'General_Psychiatry';
const RED_FLAG_CATEGORY = 'Medical Red Flags';
const RED_FLAG_CASE_TYPE = 'General_Psychiatry';

const PSYCHOSIS_NOTES_DRAFT_KEY = 'gpCasePsychosisNotesDraft';

const MANIA_VALUE_FIXES = {
    'Grandiosity (mania)': 'Grandiosity'
};

function normalizePicklistValue(value) {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeManiaValues(list = []) {
    return list
        .map(value => MANIA_VALUE_FIXES[value] || value)
        .map(normalizePicklistValue)
        .filter(Boolean);
}

function getPsychosisNotesStorageKey(caseId) {
    return `${PSYCHOSIS_NOTES_DRAFT_KEY}_${caseId || 'new'}`;
}

export default class GpCaseStepPsychosisMania extends LightningElement {
    @api errors = {};
    _caseType;

    @track psychosisSelections = [];
    @track maniaSelections = [];
    @track redFlagSelections = [];

    psychosisOptions = [];
    maniaOptions = [];
    redFlagOptions = [];
    psychosisCatalogOptions = null;
    maniaCatalogOptions = null;
    redFlagCatalogOptions = null;

    psychosisSearch = '';
    maniaSearch = '';
    redFlagSearch = '';

    psychosisNotes = '';
    redFlagNotes = '';
    dataInitialized = false;
    redFlagNotesDirty = false;
    psychosisNotesDirty = false;

    connectedCallback() {
        this.loadPsychosisCatalog();
        this.loadManiaCatalog();
        this.loadRedFlagCatalog();
        this.loadCatalogs();
        if (!this.caseId) {
            try {
                window.sessionStorage.removeItem(getPsychosisNotesStorageKey(this.caseId));
            } catch {
                // Ignore storage errors to avoid blocking the step.
            }
        }
    }

    @api caseId;

    @wire(getRecord, { recordId: '$caseId', fields: [MEDICAL_NOTES_FIELD, PSYCHOSIS_NOTES_FIELD] })
    wiredCaseNotes({ data }) {
        const medicalNotes = getFieldValue(data, MEDICAL_NOTES_FIELD);
        const psychosisNotes = getFieldValue(data, PSYCHOSIS_NOTES_FIELD);
        if (psychosisNotes && !this.psychosisNotesDirty && !this.psychosisNotes) {
            this.psychosisNotes = psychosisNotes;
            this.dataInitialized = true;
            this.emitDraftChange();
        }
        if (medicalNotes && !this.redFlagNotesDirty && !this.redFlagNotes) {
            this.redFlagNotes = medicalNotes;
            this.dataInitialized = true;
            this.emitDraftChange();
        }
    }

    @api
    get caseType() {
        return this._caseType;
    }
    set caseType(value) {
        if (this._caseType === value) return;
        this._caseType = value;
        this.loadCatalogs();
    }

    async loadPsychosisCatalog() {
        try {
            const data = await getConcernCatalog({
                caseType: PSYCHOSIS_CASE_TYPE
            });
            if (Array.isArray(data)) {
                this.psychosisCatalogOptions = data
                    .filter((item) => ((item && item.category) || '').toLowerCase() === PSYCHOSIS_CATEGORY.toLowerCase())
                    .map((item) => ({
                        label: normalizePicklistValue(item.label),
                        value: normalizePicklistValue(item.label)
                    }))
                    .filter((item) => !!item.value);
                this.loadCatalogs();
                return;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load Psychosis Symptoms catalog', error);
        }
        this.psychosisCatalogOptions = [];
        this.loadCatalogs();
    }

    async loadManiaCatalog() {
        try {
            const data = await getConcernCatalog({
                caseType: MANIA_CASE_TYPE
            });
            if (Array.isArray(data)) {
                this.maniaCatalogOptions = data
                    .filter((item) => ((item && item.category) || '').toLowerCase() === MANIA_CATEGORY.toLowerCase())
                    .map((item) => ({
                        label: normalizePicklistValue(item.label),
                        value: normalizePicklistValue(item.label)
                    }))
                    .filter((item) => !!item.value);
                this.loadCatalogs();
                return;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load Mania/Hypomania Symptoms catalog', error);
        }
        this.maniaCatalogOptions = [];
        this.loadCatalogs();
    }

    async loadRedFlagCatalog() {
        try {
            const data = await getConcernCatalog({
                caseType: RED_FLAG_CASE_TYPE
            });
            if (Array.isArray(data)) {
                this.redFlagCatalogOptions = data
                    .filter((item) => ((item && item.category) || '').toLowerCase() === RED_FLAG_CATEGORY.toLowerCase())
                    .map((item) => ({
                        label: normalizePicklistValue(item.label),
                        value: normalizePicklistValue(item.label)
                    }))
                    .filter((item) => !!item.value);
                this.loadCatalogs();
                return;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load Medical Red Flags catalog', error);
        }
        this.redFlagCatalogOptions = [];
        this.loadCatalogs();
    }

    get psychosisCountLabel() {
        return `${this.psychosisSelections.length} selected`;
    }

    get maniaCountLabel() {
        return `${this.maniaSelections.length} selected`;
    }

    get redFlagCountLabel() {
        return `${this.redFlagSelections.length} selected`;
    }

    get psychosisFilteredOptions() {
        return this.filterOptions(this.psychosisOptions, this.psychosisSelections, this.psychosisSearch);
    }

    get maniaFilteredOptions() {
        return this.filterOptions(this.maniaOptions, this.maniaSelections, this.maniaSearch);
    }

    get redFlagFilteredOptions() {
        return this.filterOptions(this.redFlagOptions, this.redFlagSelections, this.redFlagSearch);
    }

    filterOptions(options, selectedValues, search) {
        const term = (search || '').toLowerCase();
        const selected = new Set(selectedValues);
        return options
            .filter(option => option.label.toLowerCase().includes(term))
            .map(option => ({
                ...option,
                chipClass: `chip ${selected.has(option.value) ? 'chip-selected' : ''}`
            }));
    }

    mergeSelectionsIntoOptions(options, selections) {
        const values = Array.isArray(options) ? options : [];
        const selected = Array.isArray(selections) ? selections.map(normalizePicklistValue) : [];
        const existing = new Set(values.map(opt => opt.value));
        const extras = selected
            .filter(value => value && !existing.has(value))
            .map(value => ({ label: value, value }));
        return extras.length ? [...values, ...extras] : values;
    }

    loadCatalogs() {
        const normalized = (this.caseType || CASE_LINES.GENERAL).toLowerCase();
        const useAddiction = normalized.includes('addiction');

        const filterByLine = (list) => {
            return list
                .filter(option => {
                    const lines = option.lines || [CASE_LINES.GENERAL, CASE_LINES.ADDICTION];
                    return useAddiction ? lines.includes(CASE_LINES.ADDICTION) : lines.includes(CASE_LINES.GENERAL);
                })
                .map(option => ({
                    label: option.label,
                    value: option.value
                }));
        };

        const psychosisBase = Array.isArray(this.psychosisCatalogOptions) ? this.psychosisCatalogOptions : [];
        const maniaBase = Array.isArray(this.maniaCatalogOptions) ? this.maniaCatalogOptions : [];
        const redFlagBase = Array.isArray(this.redFlagCatalogOptions) ? this.redFlagCatalogOptions : [];
        this.psychosisOptions = filterByLine(psychosisBase);
        this.maniaOptions = filterByLine(maniaBase);
        this.redFlagOptions = filterByLine(redFlagBase);
        this.psychosisOptions = this.mergeSelectionsIntoOptions(this.psychosisOptions, this.psychosisSelections);
        this.maniaOptions = this.mergeSelectionsIntoOptions(this.maniaOptions, this.maniaSelections);
        this.redFlagOptions = this.mergeSelectionsIntoOptions(this.redFlagOptions, this.redFlagSelections);

        this.syncSelections();
    }

    syncSelections(emit = true) {
        const keepIfPresent = (current, options) => current.filter(value => options.some(opt => opt.value === value));
        this.psychosisSelections = keepIfPresent(this.psychosisSelections, this.psychosisOptions);
        this.maniaSelections = keepIfPresent(this.maniaSelections, this.maniaOptions);
        this.redFlagSelections = keepIfPresent(this.redFlagSelections, this.redFlagOptions);
        if (emit && this.dataInitialized) {
            this.emitDraftChange();
        }
    }

    @api
    set data(value) {
        if (!value) return;
        this.dataInitialized = true;
        this.psychosisSelections = Array.isArray(value.psychosisSymptomsDraft)
            ? [...value.psychosisSymptomsDraft]
            : [];
        this.maniaSelections = normalizeManiaValues(
            Array.isArray(value.maniaSymptomsDraft)
                ? [...value.maniaSymptomsDraft]
                : []
        );
        this.redFlagSelections = Array.isArray(value.medicalRedFlagsDraft)
            ? [...value.medicalRedFlagsDraft]
            : [];
        const hasPsychosisDraft = Object.prototype.hasOwnProperty.call(value, 'psychosisNotesDraft');
        const draftPsychosisNotes = hasPsychosisDraft ? (value.psychosisNotesDraft || '') : '';
        const recordPsychosisNotes = value.Psychosis_Notes__c || '';
        if (draftPsychosisNotes) {
            this.psychosisNotes = draftPsychosisNotes;
        } else if (recordPsychosisNotes) {
            this.psychosisNotes = recordPsychosisNotes;
        } else if (this.psychosisNotesDirty && this.psychosisNotes) {
            // Keep local draft when parent sends an empty draft on step change.
            this.psychosisNotes = this.psychosisNotes;
        } else {
            this.psychosisNotes = '';
        }
        if (!this.psychosisNotes && this.caseId) {
            try {
                const cached = window.sessionStorage.getItem(getPsychosisNotesStorageKey(this.caseId));
                if (cached) {
                    this.psychosisNotes = cached;
                }
            } catch {
                // Ignore storage errors to avoid blocking the step.
            }
        }
        const hasRedFlagDraft = Object.prototype.hasOwnProperty.call(value, 'redFlagNotesDraft');
        const hasRedFlagNoteProp = Object.prototype.hasOwnProperty.call(value, 'Red_Flag_Notes__c');
        const hasMedicalNoteProp = Object.prototype.hasOwnProperty.call(value, 'Medical_Notes__c');
        if (hasRedFlagDraft) {
            this.redFlagNotes = value.redFlagNotesDraft || '';
        } else if (hasRedFlagNoteProp || hasMedicalNoteProp) {
            const redFlagValue = (hasRedFlagNoteProp ? value.Red_Flag_Notes__c : null)
                ?? (hasMedicalNoteProp ? value.Medical_Notes__c : null)
                ?? '';
            this.redFlagNotes = redFlagValue === 'See medical red flag selections.' ? '' : redFlagValue;
        }
        if (this.redFlagOptions.length) {
            this.redFlagOptions = this.mergeSelectionsIntoOptions(this.redFlagOptions, this.redFlagSelections);
        }
        if (this.psychosisOptions.length) {
            this.psychosisOptions = this.mergeSelectionsIntoOptions(this.psychosisOptions, this.psychosisSelections);
        }
        if (this.maniaOptions.length) {
            this.maniaOptions = this.mergeSelectionsIntoOptions(this.maniaOptions, this.maniaSelections);
        }
        if (this.psychosisOptions.length || this.maniaOptions.length || this.redFlagOptions.length) {
            this.syncSelections(false);
        }
    }

    get data() {
        return this.buildPayload();
    }

    handlePsychosisSearch(event) {
        this.psychosisSearch = event.target.value || '';
    }

    handleManiaSearch(event) {
        this.maniaSearch = event.target.value || '';
    }

    handleRedFlagSearch(event) {
        this.redFlagSearch = event.target.value || '';
    }

    handlePsychosisToggle(event) {
        this.psychosisSelections = this.toggleValue(this.psychosisSelections, event.currentTarget.dataset.value);
        this.emitDraftChange();
    }

    handleManiaToggle(event) {
        this.maniaSelections = this.toggleValue(this.maniaSelections, event.currentTarget.dataset.value);
        this.emitDraftChange();
    }

    handleRedFlagToggle(event) {
        this.redFlagSelections = this.toggleValue(this.redFlagSelections, event.currentTarget.dataset.value);
        this.emitDraftChange();
    }

    toggleValue(list, value) {
        if (!value) return list;
        const normalizedValue = normalizePicklistValue(value);
        const set = new Set(list);
        if (set.has(normalizedValue)) {
            set.delete(normalizedValue);
        } else {
            set.add(normalizedValue);
        }
        return Array.from(set);
    }

    handlePsychosisNotesChange(event) {
        const value = event?.detail?.value ?? event?.target?.value ?? '';
        this.psychosisNotes = value;
        this.psychosisNotesDirty = true;
        if (this.caseId) {
            try {
                const key = getPsychosisNotesStorageKey(this.caseId);
                if (this.psychosisNotes) {
                    window.sessionStorage.setItem(key, this.psychosisNotes);
                } else {
                    window.sessionStorage.removeItem(key);
                }
            } catch {
                // Ignore storage errors to avoid blocking input.
            }
        }
        this.emitDraftChange();
    }

    handleRedFlagNotesChange(event) {
        this.redFlagNotes = event.target.value;
        this.redFlagNotesDirty = true;
        this.emitDraftChange();
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('next', {
            detail: this.buildPayload()
        }));
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    emitDraftChange() {
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: this.buildPayload()
        }));
    }

    buildPayload() {
        const requiresPsychosisNotes =
            this.psychosisSelections.length > 0 || this.maniaSelections.length > 0;
        const safeRedFlagNotes =
            this.redFlagNotes && this.redFlagNotes.trim()
                ? this.redFlagNotes.trim()
                : null;
        const safePsychosisNotes = requiresPsychosisNotes
            ? (this.psychosisNotes && this.psychosisNotes.trim() ? this.psychosisNotes.trim() : null)
            : null;

        return {
            Psychosis_Notes__c: safePsychosisNotes,
            Red_Flag_Notes__c: safeRedFlagNotes,
            Medical_Notes__c: safeRedFlagNotes,
            psychosisSymptomsDraft: [...this.psychosisSelections],
            maniaSymptomsDraft: [...this.maniaSelections],
            medicalRedFlagsDraft: [...this.redFlagSelections],
            psychosisNotesDraft: this.psychosisNotes || '',
            redFlagNotesDraft: this.redFlagNotes || ''
        };
    }
}