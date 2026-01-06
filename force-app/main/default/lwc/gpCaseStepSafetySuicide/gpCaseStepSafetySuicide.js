import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import ACCESS_TO_MEANS_FIELD from '@salesforce/schema/Case.Access_to_Means__c';

const IDEATION_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'Passive', value: 'Passive' },
    { label: 'Active - No Plan', value: 'Active - No Plan' },
    { label: 'Active - With Plan', value: 'Active - With Plan' },
    { label: 'Unknown', value: 'Unknown' }
];

const ACCESS_MEANS_FALLBACK = [
    { label: 'None', value: 'None' },
    { label: 'Firearms - Unlocked', value: 'Firearms - Unlocked' },
    { label: 'Firearms - Locked', value: 'Firearms - Locked' },
    { label: 'Large medication supply', value: 'Large medication supply' },
    { label: 'Ligature risk', value: 'Ligature risk' }
];

export default class GpCaseStepSafetySuicide extends LightningElement {
    @api errors = {};

    ideation = '';
    lastAttemptDate = '';
    protectiveFactors = '';
    suicidalIntent = false;
    pastAttempts = '';
    @track accessToMeans = [];
    @track accessMeansOptions = [];

    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseInfo;

    get caseRecordTypeId() {
        return this.caseInfo?.data?.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: ACCESS_TO_MEANS_FIELD })
    wiredAccessMeans({ data, error }) {
        if (data?.values) {
            this.accessMeansOptions = data.values.map((option) => ({
                label: option.label,
                value: option.value
            }));
        } else if (error) {
            this.accessMeansOptions = [];
        }
    }

    get ideationOptions() {
        return IDEATION_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.ideation
        }));
    }

    get showRiskDetail() {
        return this.ideation && !['None', 'Unknown'].includes(this.ideation);
    }

    get meansOptions() {
        const selected = new Set(this.accessToMeans);
        const options = this.accessMeansOptions.length ? this.accessMeansOptions : ACCESS_MEANS_FALLBACK;
        return options.map(option => ({
            ...option,
            checked: selected.has(option.value)
        }));
    }

    get ideationError() {
        return this.errors?.Suicidal_Ideation__c;
    }

    get protectiveFactorsError() {
        return this.errors?.Protective_Factors__c;
    }

    get pastAttemptsError() {
        return this.errors?.Past_Suicide_Attempts__c;
    }

    get accessMeansError() {
        return this.errors?.Access_to_Means__c;
    }

    formatDateForInput(value) {
        if (!value) return '';
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        return value;
    }

    parseDateForPayload(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        return new Date(value);
    }

    @api
    set data(value) {
        if (!value) return;
        this.ideation = value.Suicidal_Ideation__c || '';
        this.lastAttemptDate = this.formatDateForInput(value.Last_Attempt_Date__c);
        this.protectiveFactors = value.Protective_Factors__c || '';
        this.suicidalIntent = Boolean(value.Suicidal_Intent__c);
        this.pastAttempts = this.normalizeNumber(value.Past_Suicide_Attempts__c);
        this.accessToMeans = this.parseMultiValue(value.Access_to_Means__c);
    }

    get data() {
        return this.buildPayload();
    }

    parseMultiValue(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        return value.split(';').map((item) => item.trim()).filter(Boolean);
    }

    normalizeNumber(value) {
        if (value === null || typeof value === 'undefined') return '';
        return value;
    }

    handleIdeationChange(event) {
        this.ideation = event.target.value;
        if (!this.showRiskDetail) {
            this.protectiveFactors = '';
            this.suicidalIntent = false;
            this.pastAttempts = '';
            this.accessToMeans = [];
        }
        this.emitDraftChange();
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        if (!field) return;

        if (field === 'Last_Attempt_Date__c') {
            this.lastAttemptDate = value;
        } else if (field === 'Protective_Factors__c') {
            this.protectiveFactors = value;
        } else if (field === 'Past_Suicide_Attempts__c') {
            this.pastAttempts = value;
        }
        this.emitDraftChange();
    }

    handleCheckboxChange(event) {
        this.suicidalIntent = event.target.checked;
        this.emitDraftChange();
    }

    handleMeansToggle(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const set = new Set(this.accessToMeans);
        if (set.has(value)) {
            set.delete(value);
        } else {
            set.add(value);
        }
        this.accessToMeans = Array.from(set);
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
        return {
            Suicidal_Ideation__c: this.ideation || null,
            Last_Attempt_Date__c: this.parseDateForPayload(this.lastAttemptDate),
            Protective_Factors__c: this.protectiveFactors || null,
            Suicidal_Intent__c: this.suicidalIntent,
            Past_Suicide_Attempts__c: this.getNumberOrNull(this.pastAttempts),
            Access_to_Means__c: this.accessToMeans.length ? this.accessToMeans.join(';') : null,
            suicidalIdeationDraft: this.ideation,
            accessToMeansDraft: [...this.accessToMeans]
        };
    }

    getNumberOrNull(value) {
        if (value === '' || value === null || typeof value === 'undefined') {
            return null;
        }
        const parsed = Number(value);
        return isNaN(parsed) ? null : parsed;
    }
}