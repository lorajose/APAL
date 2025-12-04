import { LightningElement, api, track } from 'lwc';

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

function normalizeMultiValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean);
}

function serializeMultiValue(values) {
    if (!values || !values.length) return null;
    return values.join(';');
}

function normalizeManiaValues(list = []) {
    return list
        .map(value => MANIA_VALUE_FIXES[value] || value)
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

    psychosisSearch = '';
    maniaSearch = '';
    redFlagSearch = '';

    psychosisNotes = '';
    redFlagNotes = '';

    connectedCallback() {
        this.loadCatalogs();
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

        this.psychosisOptions = filterByLine(PSYCHOSIS_OPTIONS);
        this.maniaOptions = filterByLine(MANIA_OPTIONS);
        this.redFlagOptions = filterByLine(RED_FLAG_OPTIONS);

        this.syncSelections();
    }

    syncSelections() {
        const keepIfPresent = (current, options) => current.filter(value => options.some(opt => opt.value === value));
        this.psychosisSelections = keepIfPresent(this.psychosisSelections, this.psychosisOptions);
        this.maniaSelections = keepIfPresent(this.maniaSelections, this.maniaOptions);
        this.redFlagSelections = keepIfPresent(this.redFlagSelections, this.redFlagOptions);
        this.emitDraftChange();
    }

    @api
    set data(value) {
        if (!value) return;
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
        this.redFlagNotes = value.Red_Flag_Notes__c || '';
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
        const set = new Set(list);
        if (set.has(value)) {
            set.delete(value);
        } else {
            set.add(value);
        }
        return Array.from(set);
    }

    handlePsychosisNotesChange(event) {
        this.psychosisNotes = event.target.value;
        this.emitDraftChange();
    }

    handleRedFlagNotesChange(event) {
        this.redFlagNotes = event.target.value;
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
        const requiresMedicalNotes = this.redFlagSelections.length > 0;
        const safeRedFlagNotes = requiresMedicalNotes
            ? (this.redFlagNotes && this.redFlagNotes.trim() ? this.redFlagNotes : 'See medical red flag selections.')
            : null;

        return {
            Psychosis_Symptoms__c: serializeMultiValue(this.psychosisSelections),
            Mania_Symptoms__c: serializeMultiValue(this.maniaSelections),
            Medical_Red_Flags__c: serializeMultiValue(this.redFlagSelections),
            Psychosis_Notes__c: this.psychosisNotes || null,
            Red_Flag_Notes__c: safeRedFlagNotes,
            Medical_Notes__c: safeRedFlagNotes,
            psychosisSymptomsDraft: [...this.psychosisSelections],
            maniaSymptomsDraft: [...this.maniaSelections],
            medicalRedFlagsDraft: [...this.redFlagSelections]
        };
    }
}