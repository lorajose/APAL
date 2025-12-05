import { LightningElement, api, track } from 'lwc';
import getPcqtOptions from '@salesforce/apex/GPCaseService.getPcqtOptions';

const PCQT_OPTIONS = [{
        label: 'Diagnosis clarification',
        value: 'Diagnosis clarification'
    },
    {
        label: 'Medication strategy',
        value: 'Medication strategy'
    },
    {
        label: 'Safety risk assessment',
        value: 'Safety risk assessment'
    },
    {
        label: 'Psychosis evaluation',
        value: 'Psychosis evaluation'
    },
    {
        label: 'Mania/hypomania evaluation',
        value: 'Mania/hypomania evaluation'
    },
    {
        label: 'Substance use/withdrawal management',
        value: 'Substance use/withdrawal management'
    },
    {
        label: 'Medical contributor/clearance guidance',
        value: 'Medical contributor/clearance guidance'
    },
    {
        label: 'Therapy/referral options',
        value: 'Therapy/referral options'
    },
    {
        label: 'Treatment-resistant depression strategy',
        value: 'Treatment-resistant depression strategy'
    },
    {
        label: 'ADHD evaluation',
        value: 'ADHD evaluation'
    },
    {
        label: 'Anxiety differential',
        value: 'Anxiety differential'
    },
    {
        label: 'Sleep disturbance management',
        value: 'Sleep disturbance management'
    },
    {
        label: 'PTSD/trauma evaluation',
        value: 'PTSD/trauma evaluation'
    },
    {
        label: 'Disposition guidance (OP vs ED)',
        value: 'Disposition guidance (OP vs ED)'
    },
    {
        label: 'Legal/safety (IPV, abuse, duty to warn)',
        value: 'Legal/safety (IPV, abuse, duty to warn)'
    },
    {
        label: 'Cognitive change/delirium',
        value: 'Cognitive change/delirium'
    },
    {
        label: 'Perinatal/postpartum concerns',
        value: 'Perinatal/postpartum concerns'
    },
    {
        label: 'Child/adolescent concern',
        value: 'Child/adolescent concern'
    },
    {
        label: 'Capacity assessment',
        value: 'Capacity assessment'
    }
];

const IMPAIRED_DOMAIN_OPTIONS = [{
        label: 'Work',
        value: 'Work'
    },
    {
        label: 'ADLs',
        value: 'ADLs'
    },
    {
        label: 'Appetite',
        value: 'Appetite'
    },
    {
        label: 'Concentration',
        value: 'Concentration'
    },
    {
        label: 'School',
        value: 'School'
    },
    {
        label: 'Sleep',
        value: 'Sleep'
    },
    {
        label: 'Energy',
        value: 'Energy'
    }
];

const TOP_SYMPTOMS = [{
        label: 'Depressed mood',
        value: 'Depressed mood'
    },
    {
        label: 'Anhedonia',
        value: 'Anhedonia'
    },
    {
        label: 'Anxiety',
        value: 'Anxiety'
    },
    {
        label: 'Panic',
        value: 'Panic'
    },
    {
        label: 'Insomnia',
        value: 'Insomnia'
    },
    {
        label: 'Hypersomnia',
        value: 'Hypersomnia'
    },
    {
        label: 'Appetite change',
        value: 'Appetite change'
    },
    {
        label: 'Low energy',
        value: 'Low energy'
    },
    {
        label: 'Poor concentration',
        value: 'Poor concentration'
    }
];

const IMPAIRMENT_LEVEL_OPTIONS = [{
        label: '—',
        value: ''
    },
    {
        label: 'None',
        value: 'None'
    },
    {
        label: 'Mild',
        value: 'Mild'
    },
    {
        label: 'Moderate',
        value: 'Moderate'
    },
    {
        label: 'Severe',
        value: 'Severe'
    },
    {
        label: 'Unknown',
        value: 'Unknown'
    }
];

const COURSE_OPTIONS = [{
        label: '—',
        value: ''
    },
    {
        label: 'Abrupt (hours)',
        value: 'Abrupt (hours)'
    },
    {
        label: 'Subacute (days)',
        value: 'Subacute (days)'
    },
    {
        label: 'Chronic (months+)',
        value: 'Chronic (months+)'
    },
    {
        label: 'Waxing/waning',
        value: 'Waxing/waning'
    },
    {
        label: 'Unknown',
        value: 'Unknown'
    }
];

function normalizeMultiSelect(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    return value
        .split(';')
        .map(v => v.trim())
        .filter(Boolean);
}

function serializeMultiSelect(values) {
    if (!values || !values.length) {
        return null;
    }
    return values.join(';');
}

export default class GpCaseStepPresenting extends LightningElement {
    @api caseId;
    @api errors = {};
    _caseType;

    @track pcqtSelected = [];
    @track impairedDomains = [];
    @track selectedTopSymptoms = [];

    @track pcqtSearch = '';
    @track domainsSearch = '';
    @track symptomSearch = '';

    symptomOnsetDate = '';
    symptomOnsetDateValue = null;
    impairmentLevel = '';
    course = '';
    abruptChange = false;
    otherSymptoms = '';
    pcqtOptions = [...PCQT_OPTIONS];

    connectedCallback() {
        if (!this._caseType) {
            this._caseType = 'General_Psychiatry';
            this.loadPcqtOptions();
        }
    }

    @api
    get caseType() {
        return this._caseType;
    }
    set caseType(value) {
        if (this._caseType === value) return;
        this._caseType = value;
        this.loadPcqtOptions();
    }

    get impairmentLevelOptions() {
        return IMPAIRMENT_LEVEL_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.impairmentLevel
        }));
    }

    get courseOptions() {
        return COURSE_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.course
        }));
    }

    get pcqtFilteredOptions() {
        const term = (this.pcqtSearch || '').toLowerCase();
        const selected = new Set(this.pcqtSelected);
        return this.pcqtOptions
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                chipClass: `chip ${selected.has(opt.value) ? 'chip-selected' : ''}`
            }));
    }

    get impairedFilteredOptions() {
        const term = (this.domainsSearch || '').toLowerCase();
        const selected = new Set(this.impairedDomains);
        return IMPAIRED_DOMAIN_OPTIONS
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                chipClass: `chip ${selected.has(opt.value) ? 'chip-selected' : ''}`
            }));
    }

    get filteredTopSymptoms() {
        const term = (this.symptomSearch || '').toLowerCase();
        const selected = new Set(this.selectedTopSymptoms.map(item => item.value));
        return TOP_SYMPTOMS
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                checked: selected.has(opt.value)
            }));
    }

    get pcqtCountLabel() {
        const count = this.pcqtSelected.length;
        return `${count} selected`;
    }

    get impairedCountLabel() {
        const count = this.impairedDomains.length;
        return `${count} selected`;
    }

    get hasSelectedTopSymptoms() {
        return this.selectedTopSymptoms.length > 0;
    }

    get resolvedCaseType() {
        return this._caseType || 'General_Psychiatry';
    }

    async loadPcqtOptions() {
        try {
            const data = await getPcqtOptions({
                caseType: this.resolvedCaseType
            });
            if (Array.isArray(data) && data.length) {
                this.pcqtOptions = data.map(item => ({
                    label: item.label,
                    value: item.value
                }));
                this.syncPcqtSelectionWithOptions();
                return;
            }
        } catch (error) {
            console.warn('Failed to load Primary Clinical Questions catalog', error);
        }
        this.pcqtOptions = [...PCQT_OPTIONS];
        this.syncPcqtSelectionWithOptions();
    }

    syncPcqtSelectionWithOptions() {
        const allowed = new Set(this.pcqtOptions.map(opt => opt.value));
        const filtered = this.pcqtSelected.filter(value => allowed.has(value));
        if (filtered.length !== this.pcqtSelected.length) {
            this.pcqtSelected = filtered;
            this.emitDraftChange();
        }
    }

    @api
    set data(value) {
        if (!value) return;
        const pcqtDraft = Array.isArray(value.primaryClinicalQuestionTypesDraft) ?
            [...value.primaryClinicalQuestionTypesDraft] :
            normalizeMultiSelect(value.Primary_Clinical_Question_Types__c);
        this.pcqtSelected = pcqtDraft;

        const impairedDraft = Array.isArray(value.impairedDomainsDraft) ?
            [...value.impairedDomainsDraft] :
            normalizeMultiSelect(value.Impaired_Domains__c);
        this.impairedDomains = impairedDraft;

        this.symptomOnsetDate = this.formatDateForInput(value.Symptom_Onset_Date__c);
        this.symptomOnsetDateValue = this.normalizeDateValue(value.Symptom_Onset_Date__c);
        this.impairmentLevel = value.Impairment_Level__c || '';
        this.course = value.Course__c || '';
        this.abruptChange = Boolean(value.Abrupt_Change__c);
        this.otherSymptoms = value.Other_Symptoms__c || '';

        if (Array.isArray(value.topSymptomsDraft)) {
            this.selectedTopSymptoms = value.topSymptomsDraft.map(item => ({
                value: item.value,
                label: item.label || item.value,
                note: item.note || ''
            }));
        } else {
            this.selectedTopSymptoms = this.parseTopSymptomPayload(value.Top_Symptoms__c);
        }
    }

    get data() {
        return this.buildPayload();
    }

    parseTopSymptomPayload(rawValue) {
        if (!rawValue) {
            return [];
        }
        if (Array.isArray(rawValue)) {
            return rawValue.map(item => ({
                value: item.value,
                label: item.label || item.value,
                note: item.note || ''
            }));
        }
        try {
            const parsed = JSON.parse(rawValue);
            if (Array.isArray(parsed)) {
                return parsed.map(item => ({
                    value: item.value,
                    label: item.label || item.value,
                    note: item.note || ''
                }));
            }
        } catch (e) {
            console.warn('Unable to parse Top Symptoms payload', e);
        }
        return [];
    }

    handlePcqtSearch(event) {
        this.pcqtSearch = event.target.value || '';
    }

    handleDomainSearch(event) {
        this.domainsSearch = event.target.value || '';
    }

    handleSymptomSearch(event) {
        this.symptomSearch = event.target.value || '';
    }

    handlePcqtToggle(event) {
        const value = event.currentTarget.dataset.value;
        this.toggleSelection('pcqtSelected', value);
    }

    handleDomainToggle(event) {
        const value = event.currentTarget.dataset.value;
        this.toggleSelection('impairedDomains', value);
    }

    handleSymptomToggle(event) {
        const value = event.target.dataset.value;
        if (!value) return;

        const index = this.selectedTopSymptoms.findIndex(item => item.value === value);
        if (index > -1) {
            this.selectedTopSymptoms = [
                ...this.selectedTopSymptoms.slice(0, index),
                ...this.selectedTopSymptoms.slice(index + 1)
            ];
        } else {
            const option = TOP_SYMPTOMS.find(opt => opt.value === value);
            if (option) {
                this.selectedTopSymptoms = [
                    ...this.selectedTopSymptoms,
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

    handleSymptomNoteChange(event) {
        const value = event.target.dataset.value;
        const note = event.target.value;
        if (!value) return;

        this.selectedTopSymptoms = this.selectedTopSymptoms.map(item =>
            item.value === value ? {
                ...item,
                note
            } :
            item
        );
        this.emitDraftChange();
    }

    handleSymptomRemove(event) {
        const value = event.currentTarget.dataset.value;
        if (!value) return;
        this.selectedTopSymptoms = this.selectedTopSymptoms.filter(item => item.value !== value);
        this.emitDraftChange();
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        if (!field) return;

        if (field === 'Symptom_Onset_Date__c') {
            this.symptomOnsetDate = value;
            this.symptomOnsetDateValue = this.normalizeDateValue(value);
        } else if (field === 'Impairment_Level__c') {
            this.impairmentLevel = value;
        } else if (field === 'Course__c') {
            this.course = value;
        } else if (field === 'Other_Symptoms__c') {
            this.otherSymptoms = value;
        }
        this.emitDraftChange();
    }

    handleCheckboxChange(event) {
        this.abruptChange = event.target.checked;
        this.emitDraftChange();
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    handleNext() {
        const payload = this.buildPayload();
        this.dispatchEvent(new CustomEvent('next', {
            detail: payload
        }));
    }

    toggleSelection(stateKey, value) {
        const current = new Set(this[stateKey]);
        if (current.has(value)) {
            current.delete(value);
        } else {
            current.add(value);
        }
        this[stateKey] = Array.from(current);
        this.emitDraftChange();
    }

    emitDraftChange() {
        const payload = this.buildPayload();
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }

    buildPayload() {
        const formattedOnsetDate = this.formatDateForSalesforce(this.symptomOnsetDateValue);
        const topSymptomsDraft = this.selectedTopSymptoms.map(item => ({
            value: item.value,
            label: item.label,
            note: item.note || ''
        }));
        const topSymptomNotesDraft = {};
        topSymptomsDraft.forEach(item => {
            topSymptomNotesDraft[item.value] = item.note || '';
        });

        return {
            Primary_Clinical_Question_Types__c: serializeMultiSelect(this.pcqtSelected),
            primaryClinicalQuestionTypesDraft: [...this.pcqtSelected],
            Impaired_Domains__c: serializeMultiSelect(this.impairedDomains),
            impairedDomainsDraft: [...this.impairedDomains],
            Symptom_Onset_Date__c: formattedOnsetDate,
            Impairment_Level__c: this.impairmentLevel || null,
            Abrupt_Change__c: this.abruptChange,
            Course__c: this.course || null,
            Other_Symptoms__c: this.otherSymptoms || null,
            Top_Symptoms__c: this.serializeTopSymptoms(),
            Top_Symptom_Count__c: this.selectedTopSymptoms.length,
            topSymptomsDraft,
            topSymptomNotesDraft
        };
    }

    serializeTopSymptoms() {
        if (!this.selectedTopSymptoms.length) {
            return null;
        }
        return this.selectedTopSymptoms
            .map(item => item.value)
            .join(';');
    }

    formatDateForInput(value) {
        const normalized = this.normalizeDateValue(value);
        if (!normalized) return '';
        return normalized.toISOString().slice(0, 10);
    }

    normalizeDateValue(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    formatDateForSalesforce(dateValue) {
        if (!dateValue) return null;
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }
}