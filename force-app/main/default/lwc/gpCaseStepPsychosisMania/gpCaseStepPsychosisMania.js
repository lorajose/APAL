import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import MEDICAL_NOTES_FIELD from '@salesforce/schema/Case.Medical_Notes__c';
import CASE_RECORDTYPE_FIELD from '@salesforce/schema/Case.RecordTypeId';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import PSYCHOSIS_FIELD from '@salesforce/schema/Case.Psychosis_Symptoms__c';
import MANIA_FIELD from '@salesforce/schema/Case.Mania_Symptoms__c';
import RED_FLAGS_FIELD from '@salesforce/schema/Case.Medical_Red_Flags__c';

const CASE_LINES = {
    GENERAL: 'general',
    ADDICTION: 'addiction'
};

const PSYCHOSIS_OPTIONS = [
    { label: 'Auditory hallucinations', value: 'Auditory hallucinations' },
    { label: 'Visual hallucinations', value: 'Visual hallucinations' },
    { label: 'Tactile/other hallucinations', value: 'Tactile/other hallucinations' },
    { label: 'Persecutory delusions', value: 'Persecutory delusions' },
    { label: 'Ideas of reference', value: 'Ideas of reference' },
    { label: 'Grandiosity', value: 'Grandiosity' },
    { label: 'Thought disorganization', value: 'Thought disorganization' },
    { label: 'Bizarre behavior', value: 'Bizarre behavior' },
    { label: 'Catatonia', value: 'Catatonia' }
];

const MANIA_OPTIONS = [
    { label: 'Decreased need for sleep', value: 'Decreased need for sleep' },
    { label: 'Pressured speech', value: 'Pressured speech' },
    { label: 'Racing thoughts', value: 'Racing thoughts' },
    { label: 'Grandiosity', value: 'Grandiosity' },
    { label: 'Risky spending/sex/driving', value: 'Risky spending/sex/driving' },
    { label: 'Increased goal-directed activity', value: 'Increased goal-directed activity' },
    { label: 'Irritability', value: 'Irritability' },
    { label: 'Distractibility', value: 'Distractibility' }
];

const RED_FLAG_OPTIONS = [
    { label: 'Fever/infection', value: 'Fever/infection' },
    { label: 'Head injury', value: 'Head injury' },
    { label: 'Seizure', value: 'Seizure' },
    { label: 'Thyroid/endocrine', value: 'Thyroid/endocrine' },
    { label: 'Pain/untreated', value: 'Pain/untreated' },
    { label: 'Steroid or stimulant use', value: 'Steroid or stimulant use' },
    { label: 'Medication started/stopped', value: 'Medication started/stopped' },
    { label: 'Delirium suspected', value: 'Delirium suspected' },
    { label: 'Sleep apnea', value: 'Sleep apnea' }
];

const MANIA_VALUE_FIXES = {
    'Grandiosity (mania)': 'Grandiosity'
};

function normalizePicklistValue(value) {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeMultiValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value
        .split(';')
        .map((item) => normalizePicklistValue(item))
        .filter(Boolean);
}

function serializeMultiValue(values) {
    if (!values || !values.length) return null;
    return values.join(';');
}

function normalizeManiaValues(list = []) {
    return list
        .map(value => MANIA_VALUE_FIXES[value] || value)
        .map(normalizePicklistValue)
        .filter(Boolean);
}

export default class GpCaseStepPsychosisMania extends LightningElement {
    @api errors = {};
    _caseType;

    @track psychosisSelections = [];
    @track maniaSelections = [];
    @track redFlagSelections = [];

    psychosisOptions = [...PSYCHOSIS_OPTIONS];
    maniaOptions = [...MANIA_OPTIONS];
    redFlagOptions = [...RED_FLAG_OPTIONS];
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
    recordTypeId;

    connectedCallback() {
        this.loadCatalogs();
    }

    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseInfo;

    @api caseId;

    @wire(getRecord, { recordId: '$caseId', fields: [MEDICAL_NOTES_FIELD, CASE_RECORDTYPE_FIELD] })
    wiredCaseNotes({ data }) {
        const medicalNotes = getFieldValue(data, MEDICAL_NOTES_FIELD);
        const recordTypeId = getFieldValue(data, CASE_RECORDTYPE_FIELD);
        if (recordTypeId) {
            this.recordTypeId = recordTypeId;
        }
        if (medicalNotes && !this.redFlagNotesDirty && !this.redFlagNotes) {
            this.redFlagNotes = medicalNotes;
            this.dataInitialized = true;
            this.emitDraftChange();
        }
    }

    get caseRecordTypeId() {
        return this.recordTypeId || this.caseInfo?.data?.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: PSYCHOSIS_FIELD })
    wiredPsychosisPicklist({ data, error }) {
        if (data?.values?.length) {
            this.psychosisCatalogOptions = data.values.map((entry) => ({
                label: normalizePicklistValue(entry.label),
                value: normalizePicklistValue(entry.value)
            }));
            this.loadCatalogs();
        } else if (error) {
            this.psychosisCatalogOptions = null;
            // eslint-disable-next-line no-console
            console.warn('Failed to load Psychosis_Symptoms__c picklist', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: MANIA_FIELD })
    wiredManiaPicklist({ data, error }) {
        if (data?.values?.length) {
            this.maniaCatalogOptions = data.values.map((entry) => ({
                label: normalizePicklistValue(entry.label),
                value: normalizePicklistValue(entry.value)
            }));
            this.loadCatalogs();
        } else if (error) {
            this.maniaCatalogOptions = null;
            // eslint-disable-next-line no-console
            console.warn('Failed to load Mania_Symptoms__c picklist', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: RED_FLAGS_FIELD })
    wiredRedFlagsPicklist({ data, error }) {
        if (data?.values?.length) {
            this.redFlagCatalogOptions = data.values.map((entry) => ({
                label: normalizePicklistValue(entry.label),
                value: normalizePicklistValue(entry.value)
            }));
            this.loadCatalogs();
        } else if (error) {
            this.redFlagCatalogOptions = null;
            // eslint-disable-next-line no-console
            console.warn('Failed to load Medical_Red_Flags__c picklist', error);
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

        const picklistOrFallback = (catalogOptions, fallbackOptions) => {
            const catalog = Array.isArray(catalogOptions) && catalogOptions.length ? catalogOptions : [];
            if (catalog.length) return catalog;
            return Array.isArray(fallbackOptions) ? fallbackOptions : [];
        };

        const psychosisBase = picklistOrFallback(this.psychosisCatalogOptions, PSYCHOSIS_OPTIONS);
        const maniaBase = picklistOrFallback(this.maniaCatalogOptions, MANIA_OPTIONS);
        const redFlagBase = picklistOrFallback(this.redFlagCatalogOptions, RED_FLAG_OPTIONS);
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
            : normalizeMultiValue(value.Psychosis_Symptoms__c);
        this.maniaSelections = normalizeManiaValues(
            Array.isArray(value.maniaSymptomsDraft)
                ? [...value.maniaSymptomsDraft]
                : normalizeMultiValue(value.Mania_Symptoms__c)
        );
        this.redFlagSelections = Array.isArray(value.medicalRedFlagsDraft)
            ? [...value.medicalRedFlagsDraft]
            : normalizeMultiValue(value.Medical_Red_Flags__c);
        this.psychosisNotes = value.Psychosis_Notes__c || '';
        const hasRedFlagNoteProp = Object.prototype.hasOwnProperty.call(value, 'Red_Flag_Notes__c');
        const hasMedicalNoteProp = Object.prototype.hasOwnProperty.call(value, 'Medical_Notes__c');
        if (hasRedFlagNoteProp || hasMedicalNoteProp) {
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
        this.psychosisNotes = event.target.value;
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
            Psychosis_Symptoms__c: serializeMultiValue(this.psychosisSelections),
            Mania_Symptoms__c: serializeMultiValue(this.maniaSelections),
            Medical_Red_Flags__c: serializeMultiValue(this.redFlagSelections),
            Psychosis_Notes__c: safePsychosisNotes,
            Red_Flag_Notes__c: safeRedFlagNotes,
            Medical_Notes__c: safeRedFlagNotes,
            psychosisSymptomsDraft: [...this.psychosisSelections],
            maniaSymptomsDraft: [...this.maniaSelections],
            medicalRedFlagsDraft: [...this.redFlagSelections]
        };
    }
}