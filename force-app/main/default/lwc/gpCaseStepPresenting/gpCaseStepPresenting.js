import { LightningElement, api, track } from 'lwc';
import getPcqtOptions from '@salesforce/apex/GPCaseService.getPcqtOptions';
import getConcernCatalog from '@salesforce/apex/GPCaseService.getConcernCatalog';

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

const TOP_SYMPTOM_CATEGORY = 'Top Symptoms';
const TOP_SYMPTOM_CASE_TYPE = 'General_Psychiatry';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function looksLikePcqtId(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length !== 18 && trimmed.length !== 15) return false;
    return /^[a-zA-Z0-9]+$/.test(trimmed) && trimmed.toLowerCase().startsWith('a0');
}

export default class GpCaseStepPresenting extends LightningElement {
    @api caseId;
    @api errors = {};
    _caseType;
    pcqtRequired = true;
    pcqtWizardMode = true;

    @track pcqtSelected = []; // labels (picklist)
    @track pcqtSelectedIds = []; // ids from selector
    @track pcqtSelectedLabels = []; // labels coming from selector
    @track impairedDomains = [];
    @track selectedTopSymptoms = [];
    @track topSymptomOptions = [];

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
            this.loadTopSymptomOptions();
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
        this.loadTopSymptomOptions();
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
        const selected = new Set(this.pcqtSelectedIds || []);
        return this.pcqtOptions
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                chipClass: `chip wiz-chip${selected.has(opt.value) ? ' chip-selected is-selected' : ''}`
            }));
    }

    get impairedFilteredOptions() {
        const term = (this.domainsSearch || '').toLowerCase();
        const selected = new Set(this.impairedDomains);
        return IMPAIRED_DOMAIN_OPTIONS
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                chipClass: `chip wiz-chip${selected.has(opt.value) ? ' chip-selected is-selected' : ''}`
            }));
    }

    get filteredTopSymptoms() {
        const term = (this.symptomSearch || '').toLowerCase();
        const selected = new Set(this.selectedTopSymptoms.map(item => item.value));
        return this.topSymptomOptions
            .filter(opt => opt.label.toLowerCase().includes(term))
            .map(opt => ({
                ...opt,
                checked: selected.has(opt.value)
            }));
    }

    get pcqtCountLabel() {
        const count = Array.isArray(this.pcqtSelectedIds) ? this.pcqtSelectedIds.length : 0;
        return `${count} selected`;
    }

    get chipCountLabel() {
        const count = Array.isArray(this.pcqtSelected) ? this.pcqtSelected.length : 0;
        return `${count} selected`;
    }

    get selectorCountLabel() {
        const count = Array.isArray(this.pcqtSelectedIds) ? this.pcqtSelectedIds.length : 0;
        return `${count} selected`;
    }

    @api
    focusFirstError(errorPath) {
        if (errorPath === 'Primary_Clinical_Question_Types__c') {
            const pcqt = this.template.querySelector('c-pcqt-selector');
            if (pcqt && pcqt.focusFirstError) {
                pcqt.focusFirstError();
                return;
            }
            const fallback = this.template.querySelector('#pcqt-search');
            if (fallback && fallback.focus) {
                fallback.focus();
            }
        }
    }

    get pcqtSelectorValue() {
        return Array.isArray(this.pcqtSelectedIds) ? [...this.pcqtSelectedIds] : [];
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

    async loadTopSymptomOptions() {
        try {
            const data = await getConcernCatalog({
                caseType: TOP_SYMPTOM_CASE_TYPE
            });
            if (Array.isArray(data)) {
                this.topSymptomOptions = data
                    .filter(item => ((item && item.category) || '').toLowerCase() === TOP_SYMPTOM_CATEGORY.toLowerCase())
                    .map(item => ({
                        label: item.label,
                        value: item.label
                    }))
                    .filter(item => !!item.value);
                return;
            }
        } catch (error) {
            console.warn('Failed to load Top Symptoms catalog', error);
        }
        this.topSymptomOptions = [];
    }

    syncPcqtSelectionWithOptions() {
        const allowed = new Set(this.pcqtOptions.map(opt => opt.value));
        const filtered = this.pcqtSelected.filter(value => allowed.has(value));

        // Si no hay coincidencias pero sí hay selección (ej. Ids venidos del selector),
        // no borres la selección; mantenla para que el wizard no pierda el valor.
        if (filtered.length === 0 && this.pcqtSelected.length > 0) {
            return;
        }

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
            [];
        this.pcqtSelectedIds = pcqtDraft.filter(looksLikePcqtId);
        this.pcqtSelectedLabels = Array.isArray(value.primaryClinicalQuestionTypesLabels) ?
            [...value.primaryClinicalQuestionTypesLabels] :
            [];
        this.pcqtSelected = [...this.pcqtSelectedLabels];

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
            this.selectedTopSymptoms = [];
        }
    }

    get data() {
        return this.buildPayload();
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
        const value = event.currentTarget?.dataset?.id || event.currentTarget?.dataset?.value;
        if (!value) return;
        // Toggle chip list
        const arr = Array.isArray(this.pcqtSelectedIds) ? this.pcqtSelectedIds : [];
        const exists = arr.includes(value);
        this.pcqtSelectedIds = exists ? arr.filter(v => v !== value) : [...arr, value];
        this.syncPcqtLabelsFromIds();

        // Emit combined change (chips + selector ids)
        this.dispatchEvent(new CustomEvent('wizardchange', {
            detail: {
                path: 'primaryClinicalQuestionTypes',
                value: [...(this.pcqtSelectedIds || [])]
            }
        }));
        this.emitDraftChange();
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
            const option = this.topSymptomOptions.find(opt => opt.value === value);
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
            (item.value === value ? {
                ...item,
                note
            } :
            item)
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
        const arr = Array.isArray(this[stateKey]) ? this[stateKey] : [];
        const exists = arr.includes(value);
        const nextArr = exists ? arr.filter(v => v !== value) : [...arr, value];
        this[stateKey] = nextArr;
        this.emitDraftChange();
        if (stateKey === 'pcqtSelected') {
            this.dispatchEvent(new CustomEvent('wizardchange', {
                detail: {
                    path: 'primaryClinicalQuestionTypes',
                    value: [...(this.pcqtSelectedIds || [])]
                }
            }));
        }
    }

    handlePcqtChange(event) {
        const selectedIds = event?.detail?.selectedIds || [];
        const selectedLabels = event?.detail?.selectedLabels || [];
        this.pcqtSelectedIds = selectedIds.filter(looksLikePcqtId);
        if (selectedLabels.length) {
            this.pcqtSelectedLabels = selectedLabels;
        } else if (this.pcqtOptions && this.pcqtOptions.length) {
            const labelMap = new Map(this.pcqtOptions.map(opt => [opt.value, opt.label]));
            this.pcqtSelectedLabels = this.pcqtSelectedIds
                .map(id => labelMap.get(id))
                .filter(Boolean);
        } else {
            this.pcqtSelectedLabels = [];
        }
        this.pcqtSelected = [...this.pcqtSelectedLabels];
        this.emitDraftChange();
        this.dispatchEvent(new CustomEvent('wizardchange', {
            detail: {
                path: 'primaryClinicalQuestionTypes',
                value: [...this.pcqtSelectedIds]
            }
        }));
    }

    emitDraftChange() {
        const payload = this.buildPayload();
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }

    syncPcqtLabelsFromIds() {
        if (!Array.isArray(this.pcqtSelectedIds)) {
            this.pcqtSelectedLabels = [];
            this.pcqtSelected = [];
            return;
        }
        const labelMap = new Map(this.pcqtOptions.map(opt => [opt.value, opt.label]));
        this.pcqtSelectedLabels = this.pcqtSelectedIds
            .map(id => labelMap.get(id))
            .filter(Boolean);
        this.pcqtSelected = [...this.pcqtSelectedLabels];
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

        const selectedPcqtLabels = Array.isArray(this.pcqtSelectedLabels) && this.pcqtSelectedLabels.length
            ? this.pcqtSelectedLabels
            : (Array.isArray(this.pcqtSelectedIds) && this.pcqtSelectedIds.length
                ? this.pcqtSelectedIds
                    .map(id => (this.pcqtOptions || []).find(opt => opt.value === id)?.label)
                    .filter(Boolean)
                : []);

        return {
            primaryClinicalQuestionTypesDraft: [...(this.pcqtSelectedIds || [])],
            primaryClinicalQuestionTypesLabels: [...selectedPcqtLabels],
            Impaired_Domains__c: serializeMultiSelect(this.impairedDomains),
            impairedDomainsDraft: [...this.impairedDomains],
            Symptom_Onset_Date__c: formattedOnsetDate,
            Impairment_Level__c: this.impairmentLevel || null,
            Abrupt_Change__c: this.abruptChange,
            Course__c: this.course || null,
            Other_Symptoms__c: this.otherSymptoms || null,
            topSymptomsDraft,
            topSymptomNotesDraft
        };
    }

    formatDateForInput(value) {
        return this.normalizeDateValue(value) || '';
    }

    normalizeDateValue(value) {
        if (!value) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (DATE_ONLY_PATTERN.test(trimmed)) {
                return trimmed;
            }
            const isoDatePart = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
            if (isoDatePart) {
                return isoDatePart[1];
            }
            const date = new Date(trimmed);
            return isNaN(date.getTime()) ? null : this.formatDateParts(date);
        }
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : this.formatDateParts(value);
        }
        return null;
    }

    formatDateForSalesforce(dateValue) {
        return this.normalizeDateValue(dateValue);
    }

    formatDateParts(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }
}