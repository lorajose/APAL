import { LightningElement, api, track } from 'lwc';
import getConcernCatalog from '@salesforce/apex/GPCaseService.getConcernCatalog';

const PRIOR_DIAGNOSES_CATEGORY = 'Prior Diagnoses';
const PRIOR_DIAGNOSES_CASE_TYPE = 'General_Psychiatry';

const SELF_HARM_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'NSSI only', value: 'NSSI only' },
    { label: 'Prior suicide attempt', value: 'Prior suicide attempt' },
    { label: 'Both', value: 'Both' },
    { label: 'Unknown', value: 'Unknown' }
];

export default class GpCaseStepPriorDx extends LightningElement {
    @api errors = {};
    @api caseType;

    @track priorDiagnosisOptions = [];

    psychHospitalizations = '';
    edVisits = '';
    selfHarmHistory = '';
    otherPriorDiagnosis = '';

    @track selectedDiagnoses = [];
    @track diagnosisSearch = '';

    connectedCallback() {
        this.loadPriorDiagnosisOptions();
    }

    async loadPriorDiagnosisOptions() {
        try {
            const data = await getConcernCatalog({
                caseType: PRIOR_DIAGNOSES_CASE_TYPE
            });
            if (Array.isArray(data)) {
                this.priorDiagnosisOptions = data
                    .filter((item) => ((item && item.category) || '').toLowerCase() === PRIOR_DIAGNOSES_CATEGORY.toLowerCase())
                    .map((item) => ({
                        label: item.label,
                        value: item.label
                    }))
                    .filter((item) => !!item.value);
                this.mergeSelectedDiagnosesIntoOptions();
                return;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading Prior Diagnoses catalog', error);
        }
        this.priorDiagnosisOptions = [];
    }

    get selfHarmOptions() {
        return SELF_HARM_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.selfHarmHistory
        }));
    }

    get filteredDiagnosisOptions() {
        const term = (this.diagnosisSearch || '').toLowerCase();
        const selected = new Set(this.selectedDiagnoses.map((item) => item.value));
        return this.priorDiagnosisOptions
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
            this.selectedDiagnoses = [];
        }
        this.mergeSelectedDiagnosesIntoOptions();
    }

    get data() {
        return this.buildPayload();
    }

    normalizeNumber(value) {
        if (value === null || typeof value === 'undefined') return '';
        return value;
    }

    mergeSelectedDiagnosesIntoOptions() {
        if (!Array.isArray(this.selectedDiagnoses) || this.selectedDiagnoses.length === 0) {
            return;
        }
        const existingValues = new Set(
            (this.priorDiagnosisOptions || [])
                .map((option) => (option?.value || '').toString().trim())
                .filter(Boolean)
        );
        const extras = this.selectedDiagnoses
            .map((item) => (item?.value || item?.label || '').toString().trim())
            .filter((value) => value && !existingValues.has(value))
            .map((value) => ({ label: value, value }));
        if (extras.length) {
            this.priorDiagnosisOptions = [...(this.priorDiagnosisOptions || []), ...extras];
        }
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
            const option = this.priorDiagnosisOptions.find((opt) => opt.value === value);
            const label = option?.label || value;
            this.selectedDiagnoses = [
                ...this.selectedDiagnoses,
                {
                    value,
                    label,
                    note: ''
                }
            ];
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