import { LightningElement, api } from 'lwc';

const ORIENTATION_OPTIONS = [
    { label: 'Alert & oriented (x3)', value: 'Alert & oriented (x3)' },
    { label: 'Disoriented', value: 'Disoriented' },
    { label: 'Confused/waxing-waning', value: 'Confused/waxing-waning' },
    { label: 'Memory impairment', value: 'Memory impairment' },
    { label: 'Unknown', value: 'Unknown' }
];

export default class GpCaseStepCognition extends LightningElement {
    @api errors = {};

    orientation = '';
    cognitionNotes = '';

    get orientationOptions() {
        return ORIENTATION_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.orientation
        }));
    }

    get showCognitionNotes() {
        return this.orientation && this.orientation !== 'Alert & oriented (x3)';
    }

    get orientationError() {
        return this.errors?.Orientation__c;
    }

    get cognitionNotesError() {
        return this.errors?.Cognition_Notes__c;
    }

    @api
    set data(value) {
        if (!value) return;
        this.orientation = value.Orientation__c || '';
        this.cognitionNotes = value.Cognition_Notes__c || '';
    }

    get data() {
        return this.buildPayload();
    }

    handleOrientationChange(event) {
        this.orientation = event.target.value;
        if (!this.showCognitionNotes) {
            this.cognitionNotes = '';
        }
        this.emitDraftChange();
    }

    handleNotesChange(event) {
        this.cognitionNotes = event.target.value;
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
            Orientation__c: this.orientation || null,
            Cognition_Notes__c: this.showCognitionNotes ? (this.cognitionNotes || null) : null
        };
    }
}