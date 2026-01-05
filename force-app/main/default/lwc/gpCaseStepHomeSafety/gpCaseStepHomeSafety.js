import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import LETHAL_MEANS_FIELD from '@salesforce/schema/Case.Lethal_Means_Access__c';
import STRESSORS_FIELD from '@salesforce/schema/Case.Psychosocial_Stressors__c';

const HOME_SAFETY_OPTIONS = [
    { label: 'Safe', value: 'Safe' },
    { label: 'Unsafe', value: 'Unsafe' },
    { label: 'Unknown', value: 'Unknown' }
];

const LETHAL_MEANS_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'Firearms - Unlocked', value: 'Firearms - Unlocked' },
    { label: 'Firearms - Locked', value: 'Firearms - Locked' },
    { label: 'Large medication supply', value: 'Large medication supply' },
    { label: 'Other', value: 'Other' }
];

const RELIABLE_SUPPORT_OPTIONS = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
    { label: 'Limited', value: 'Limited' },
    { label: 'Unknown', value: 'Unknown' }
];

const STRESSOR_OPTIONS = [
    { label: 'Housing insecurity', value: 'Housing insecurity' },
    { label: 'Food insecurity', value: 'Food insecurity' },
    { label: 'Caregiver burden', value: 'Caregiver burden' },
    { label: 'Legal issues', value: 'Legal issues' },
    { label: 'Job/school risk', value: 'Job/school risk' },
    { label: 'Relationship conflict', value: 'Relationship conflict' },
    { label: 'Limited supports', value: 'Limited supports' },
    { label: 'Financial stress', value: 'Financial stress' }
];

function normalizeMultiValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value.split(';').map((item) => item.trim()).filter(Boolean);
}

export default class GpCaseStepHomeSafety extends LightningElement {
    @api errors = {};

    homeSafetyStatus = '';
    @track lethalMeans = [];
    meansSafetyPlan = false;
    safetyNotes = '';

    @track stressors = [];
    stressorSearch = '';

    reliableSupports = '';
    costCoverageIssues = false;
    supportsNotes = '';
    @track lethalMeansOptionsCatalog = [...LETHAL_MEANS_OPTIONS];
    @track stressorOptionsCatalog = [...STRESSOR_OPTIONS];

    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseInfo;

    get caseRecordTypeId() {
        return this.caseInfo?.data?.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: LETHAL_MEANS_FIELD })
    wiredLethalMeans({ data, error }) {
        if (data?.values?.length) {
            this.lethalMeansOptionsCatalog = data.values.map((entry) => ({
                label: entry.label,
                value: entry.value
            }));
        } else if (error) {
            this.lethalMeansOptionsCatalog = [...LETHAL_MEANS_OPTIONS];
            // eslint-disable-next-line no-console
            console.warn('Failed to load Lethal_Means_Access__c picklist', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$caseRecordTypeId', fieldApiName: STRESSORS_FIELD })
    wiredPsychosocialStressors({ data, error }) {
        if (data?.values?.length) {
            this.stressorOptionsCatalog = data.values.map((entry) => ({
                label: entry.label,
                value: entry.value
            }));
        } else if (error) {
            this.stressorOptionsCatalog = [...STRESSOR_OPTIONS];
            // eslint-disable-next-line no-console
            console.warn('Failed to load Psychosocial_Stressors__c picklist', error);
        }
    }

    get homeSafetyOptionsComputed() {
        return HOME_SAFETY_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.homeSafetyStatus
        }));
    }

    get reliableSupportOptionsComputed() {
        return RELIABLE_SUPPORT_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.reliableSupports
        }));
    }

    get showLethalMeans() {
        return this.homeSafetyStatus && this.homeSafetyStatus !== 'Safe';
    }

    get lethalMeansOptions() {
        const selected = new Set(this.lethalMeans);
        return this.lethalMeansOptionsCatalog.map(option => ({
            ...option,
            chipClass: `chip ${selected.has(option.value) ? 'chip-selected' : ''}`
        }));
    }

    get lethalMeansCountLabel() {
        return `${this.lethalMeans.length} selected`;
    }

    get filteredStressors() {
        const term = (this.stressorSearch || '').toLowerCase();
        const selected = new Set(this.stressors.map(item => item.value));
        return this.stressorOptionsCatalog
            .filter(option => option.label.toLowerCase().includes(term))
            .map(option => ({
                ...option,
                checked: selected.has(option.value)
            }));
    }

    get selectedStressors() {
        return this.stressors;
    }

    get hasStressors() {
        return this.stressors.length > 0;
    }

    get homeSafetyError() {
        return this.errors?.Home_Safety__c;
    }

    get lethalMeansError() {
        return this.errors?.Lethal_Means_Access__c;
    }

    @api
    set data(value) {
        if (!value) return;
        this.homeSafetyStatus = value.Home_Safety__c || '';
        this.lethalMeans = Array.isArray(value.lethalMeansDraft)
            ? [...value.lethalMeansDraft]
            : normalizeMultiValue(value.Lethal_Means_Access__c);
        this.meansSafetyPlan = Boolean(value.Means_Safety_Plan__c);
        this.safetyNotes = value.Safety_Notes__c || '';

        if (Array.isArray(value.psychosocialStressorsDraft)) {
            this.stressors = value.psychosocialStressorsDraft.map(item => ({
                value: item.value,
                label: item.label || item.value,
                note: item.note || '',
                recent: !!item.recent,
                historical: !!item.historical
            }));
        } else {
            this.stressors = [];
        }

        this.reliableSupports = value.Reliable_Supports__c || '';
        this.costCoverageIssues = Boolean(value.Cost_Coverage_Issues__c);
        this.supportsNotes = value.Supports_Notes__c || '';
    }

    get data() {
        return this.buildPayload();
    }

    handleHomeSafetyChange(event) {
        this.homeSafetyStatus = event.target.value;
        if (!this.showLethalMeans) {
            this.lethalMeans = [];
            this.meansSafetyPlan = false;
            this.safetyNotes = '';
        }
        this.emitDraftChange();
    }

    handleLethalToggle(event) {
        const value = event.currentTarget.dataset.value;
        if (!value) return;
        const set = new Set(this.lethalMeans);
        if (set.has(value)) {
            set.delete(value);
        } else {
            set.add(value);
        }
        this.lethalMeans = Array.from(set);
        this.emitDraftChange();
    }

    handleMeansPlanChange(event) {
        this.meansSafetyPlan = event.target.checked;
        this.emitDraftChange();
    }

    handleSafetyNotesChange(event) {
        this.safetyNotes = event.target.value;
        this.emitDraftChange();
    }

    handleStressorSearch(event) {
        this.stressorSearch = event.target.value || '';
    }

    handleStressorToggle(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const existing = this.stressors.find(item => item.value === value);
        if (existing) {
            this.stressors = this.stressors.filter(item => item.value !== value);
        } else {
            const option = this.stressorOptionsCatalog.find(opt => opt.value === value);
            if (option) {
                this.stressors = [
                    ...this.stressors,
                    {
                        value: option.value,
                        label: option.label,
                        note: '',
                        recent: false,
                        historical: false
                    }
                ];
            }
        }
        this.emitDraftChange();
    }

    handleStressorRemove(event) {
        const value = event.currentTarget.dataset.value;
        if (!value) return;
        this.stressors = this.stressors.filter(item => item.value !== value);
        this.emitDraftChange();
    }

    handleStressorNoteChange(event) {
        const value = event.target.dataset.value;
        if (!value) return;
        const note = event.target.value || '';
        this.stressors = this.stressors.map(item =>
            item.value === value ? { ...item, note } : item
        );
        this.emitDraftChange();
    }

    handleStressorFlagChange(event) {
        const value = event.target.dataset.value;
        const flag = event.target.dataset.flag;
        if (!value || !flag) return;
        const checked = event.target.checked;
        this.stressors = this.stressors.map(item =>
            item.value === value ? { ...item, [flag]: checked } : item
        );
        this.emitDraftChange();
    }

    handleReliableSupportsChange(event) {
        this.reliableSupports = event.target.value;
        this.emitDraftChange();
    }

    handleCostCoverageChange(event) {
        this.costCoverageIssues = event.target.checked;
        this.emitDraftChange();
    }

    handleSupportsNotesChange(event) {
        this.supportsNotes = event.target.value;
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
        const lethalDraft = [...this.lethalMeans];
        const stressorDraft = this.stressors.map(item => ({
            value: item.value,
            label: item.label,
            note: item.note || '',
            recent: !!item.recent,
            historical: !!item.historical
        }));

        return {
            Home_Safety__c: this.homeSafetyStatus || null,
            Lethal_Means_Access__c: this.showLethalMeans && lethalDraft.length ? lethalDraft.join(';') : null,
            Means_Safety_Plan__c: this.showLethalMeans ? this.meansSafetyPlan : false,
            Safety_Notes__c: this.showLethalMeans ? (this.safetyNotes || null) : null,
            Reliable_Supports__c: this.reliableSupports || null,
            Cost_Coverage_Issues__c: this.costCoverageIssues,
            Supports_Notes__c: this.supportsNotes || null,
            lethalMeansDraft: this.showLethalMeans ? lethalDraft : [],
            psychosocialStressorsDraft: stressorDraft
        };
    }
}