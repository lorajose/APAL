import { LightningElement, api, track } from 'lwc';

const SELF_HARM_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'NSSI only', value: 'NSSI only' },
    { label: 'Prior suicide attempt', value: 'Prior suicide attempt' },
    { label: 'Both', value: 'Both' },
    { label: 'Unknown', value: 'Unknown' }
];

const PRIOR_DIAGNOSIS_OPTIONS = [
    { label: 'MDD', value: 'MDD' },
    { label: 'Bipolar I', value: 'Bipolar I' },
    { label: 'Bipolar II', value: 'Bipolar II' },
    { label: 'GAD', value: 'GAD' },
    { label: 'Panic Disorder', value: 'Panic Disorder' },
    { label: 'PTSD', value: 'PTSD' },
    { label: 'Psychotic Disorder', value: 'Psychotic Disorder' },
    { label: 'ADHD', value: 'ADHD' },
    { label: 'OCD', value: 'OCD' },
    { label: 'SUD', value: 'SUD' },
    { label: 'Personality Disorder', value: 'Personality Disorder' },
    { label: 'Eating Disorder', value: 'Eating Disorder' },
    { label: 'Other', value: 'Other' }
];

function normalizeMultiValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value
        .split(';')
        .map((v) => v.trim())
        .filter(Boolean);
}

export default class GpCaseStepPriorDx extends LightningElement {
    @api errors = {};
    @api caseType;

    psychHospitalizations = '';
    edVisits = '';
    selfHarmHistory = '';
    otherPriorDiagnosis = '';

    @track selectedDiagnoses = [];
    @track diagnosisSearch = '';

    get selfHarmOptions() {
        return SELF_HARM_OPTIONS;
    }

    get filteredDiagnosisOptions() {
        const term = (this.diagnosisSearch || '').toLowerCase();
        const selected = new Set(this.selectedDiagnoses.map((item) => item.value));
        return PRIOR_DIAGNOSIS_OPTIONS
            .filter((option) => option.label.toLowerCase().includes(term))
            .map((option) => ({
                ...option,
                checked: selected.has(option.value)
            }));
    }

    get hasSelectedDiagnoses() {
        return this.selectedDiagnoses.length > 0;
    }

    @api
    set data(value) {
        if (!value) {
            return;
        }
        this.psychHospitalizations = this.normalizeNumber(value.Psych_Hospitalizations__c);
        this.edVisits = this.normalizeNumber(value.ED_Visits_Count__c);
        this.selfHarmHistory = value.Self_Harm_History__c || '';
        this.otherPriorDiagnosis = value.Other_Prior_Diagnosis__c || '';

        if (Array.isArray(value.priorDiagnosesDraft)) {
            this.selectedDiagnoses = value.priorDiagnosesDraft.map(item => ({
                value: item.value,
                label: item.label || item.value,
                note: item.note || ''
            }));
        } else {
            const parsed = normalizeMultiValue(value.Prior_Diagnoses__c);
            this.selectedDiagnoses = parsed.map(label => ({
                value: label,
                label,
                note: ''
            }));
        }
    }

    get data() {
        return this.buildPayload();
    }

    normalizeNumber(value) {
        if (value === null || typeof value === 'undefined') return '';
        return value;
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        if (!field) return;

        if (field === 'Psych_Hospitalizations__c') {
            this.psychHospitalizations = value;
        } else if (field === 'ED_Visits_Count__c') {
            this.edVisits = value;
        } else if (field === 'Self_Harm_History__c') {
            this.selfHarmHistory = value;
        } else if (field === 'Other_Prior_Diagnosis__c') {
            this.otherPriorDiagnosis = value;
        }
        this.emitDraftChange();
    }

    handleDiagnosisSearch(event) {
        this.diagnosisSearch = event.target.value || '';
    }

    handleDiagnosisToggle(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const exists = this.selectedDiagnoses.find((item) => item.value === value);
        if (exists) {
            this.selectedDiagnoses = this.selectedDiagnoses.filter((item) => item.value !== value);
        } else {
            const option = PRIOR_DIAGNOSIS_OPTIONS.find((opt) => opt.value === value);
            if (option) {
                this.selectedDiagnoses = [
                    ...this.selectedDiagnoses,
                    {
                        value: option.value,
                        label: option.label,
                        note: ''
                    }
                ];
            }
        }
        this.emitDraftChange();
    }

    handleDiagnosisRemove(event) {
        const value = event.currentTarget.dataset.value;
        if (!value) return;
        this.selectedDiagnoses = this.selectedDiagnoses.filter((item) => item.value !== value);
        this.emitDraftChange();
    }

    handleDiagnosisNoteChange(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const note = event.target.value || '';
        this.selectedDiagnoses = this.selectedDiagnoses.map((item) =>
            item.value === value ? { ...item, note } : item
        );
        this.emitDraftChange();
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('next', { detail: this.buildPayload() }));
    }

    emitDraftChange() {
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: this.buildPayload()
        }));
    }

    buildPayload() {
        const diagnosisValues = this.selectedDiagnoses.map((item) => item.value);
        const draft = this.selectedDiagnoses.map((item) => ({
            value: item.value,
            label: item.label,
            note: item.note || ''
        }));
        const notesMap = {};
        draft.forEach((item) => {
            notesMap[item.value] = item.note || '';
        });

        return {
            Psych_Hospitalizations__c: this.getNumberOrNull(this.psychHospitalizations),
            ED_Visits_Count__c: this.getNumberOrNull(this.edVisits),
            Self_Harm_History__c: this.selfHarmHistory || null,
            Other_Prior_Diagnosis__c: this.otherPriorDiagnosis || null,
            Prior_Diagnoses__c: diagnosisValues.length ? diagnosisValues.join(';') : null,
            priorDiagnosesDraft: draft,
            priorDiagnosesNotesDraft: notesMap
        };
    }

    getNumberOrNull(value) {
        if (value === '' || value === null || typeof value === 'undefined') {
            return null;
        }
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
}