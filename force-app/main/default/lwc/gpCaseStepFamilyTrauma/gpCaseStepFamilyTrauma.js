import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import FAMILY_HISTORY_FIELD from '@salesforce/schema/Case.Family_History__c';

const FAMILY_HISTORY_OPTIONS = [
    { label: 'Bipolar', value: 'Bipolar' },
    { label: 'Psychosis/Schizophrenia', value: 'Psychosis/Schizophrenia' },
    { label: 'Suicide', value: 'Suicide' },
    { label: 'SUD', value: 'SUD' },
    { label: 'Depression/Anxiety', value: 'Depression/Anxiety' },
    { label: 'None', value: 'None' },
    { label: 'Unknown', value: 'Unknown' }
];

export default class GpCaseStepFamilyTrauma extends LightningElement {
    @api errors = {};
    @api caseType;

    recentTrauma = false;
    dependentSafetyConcern = false;
    ipvConcern = false;
    familyHistoryNotes = '';

    @track familyHistory = [];
    @track familySearch = '';
    @track familyHistoryOptions = [...FAMILY_HISTORY_OPTIONS];

    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseInfo;

    get caseRecordTypeId() {
        return this.caseInfo?.data?.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: FAMILY_HISTORY_FIELD })
    wiredFamilyHistoryPicklist({ data, error }) {
        if (data?.values?.length) {
            this.familyHistoryOptions = data.values.map((entry) => ({
                label: entry.label,
                value: entry.value
            }));
        } else if (error) {
            this.familyHistoryOptions = [...FAMILY_HISTORY_OPTIONS];
            // eslint-disable-next-line no-console
            console.warn('Failed to load Family_History__c picklist', error);
        }
    }

    get filteredFamilyOptions() {
        const term = (this.familySearch || '').toLowerCase();
        const selected = new Set(this.familyHistory.map(item => item.value));
        return this.familyHistoryOptions
            .filter(option => option.label.toLowerCase().includes(term))
            .map(option => ({
                ...option,
                checked: selected.has(option.value)
            }));
    }

    get selectedFamilyHistory() {
        return this.familyHistory.map(item => ({
            value: item.value,
            label: item.label || item.value,
            note: item.note || ''
        }));
    }

    get hasSelectedFamily() {
        return this.familyHistory.length > 0;
    }

    @api
    set data(value) {
        if (!value) return;
        this.recentTrauma = Boolean(value.Recent_Trauma__c);
        this.dependentSafetyConcern = Boolean(value.Dependent_Safety_Concern__c);
        this.ipvConcern = Boolean(value.IPV_Concern__c);
        this.familyHistoryNotes = value.Family_History_Notes__c || '';

        if (Array.isArray(value.familyHistoryDraft)) {
            this.familyHistory = value.familyHistoryDraft.map(item => ({
                value: item.value,
                label: item.label || item.value,
                note: item.note || ''
            }));
        } else {
            this.familyHistory = [];
        }
    }

    get data() {
        return this.buildPayload();
    }

    @api
    focusFirstError(errorPath) {
        if (errorPath === 'Family_History_Notes__c') {
            const field = this.template.querySelector('.selected-card .textarea') || this.template.querySelector('#family-notes');
            if (field && field.focus) {
                field.focus();
            }
        }
    }

    handleCheckboxChange(event) {
        const field = event.target.dataset.field;
        const checked = event.target.checked;
        if (field === 'Recent_Trauma__c') {
            this.recentTrauma = checked;
        } else if (field === 'Dependent_Safety_Concern__c') {
            this.dependentSafetyConcern = checked;
        } else if (field === 'IPV_Concern__c') {
            this.ipvConcern = checked;
        }
        this.emitDraftChange();
    }

    handleNotesChange(event) {
        this.familyHistoryNotes = event.target.value;
        this.emitDraftChange();
    }

    handleFamilySearch(event) {
        this.familySearch = event.target.value || '';
    }

    handleFamilyToggle(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const exists = this.familyHistory.find(item => item.value === value);
        if (exists) {
            this.familyHistory = this.familyHistory.filter(item => item.value !== value);
        } else {
            const option = this.familyHistoryOptions.find(opt => opt.value === value);
            if (option) {
                this.familyHistory = [
                    ...this.familyHistory,
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

    handleFamilyRemove(event) {
        const value = event.currentTarget.dataset.value;
        if (!value) return;
        this.familyHistory = this.familyHistory.filter(item => item.value !== value);
        this.emitDraftChange();
    }

    handleFamilyNoteChange(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const note = event.target.value || '';
        this.familyHistory = this.familyHistory.map(item =>
            item.value === value ? { ...item, note } : item
        );
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
        const historyDraft = this.familyHistory.map(item => ({
            value: item.value,
            label: item.label,
            note: item.note || ''
        }));

        return {
            Recent_Trauma__c: this.recentTrauma,
            Dependent_Safety_Concern__c: this.dependentSafetyConcern,
            IPV_Concern__c: this.ipvConcern,
            Family_History_Notes__c: this.familyHistoryNotes || null,
            Family_History__c: historyDraft.length ? historyDraft.map(item => item.value).join(';') : null,
            familyHistoryDraft: historyDraft
        };
    }
}