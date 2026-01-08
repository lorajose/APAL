import { LightningElement, api } from 'lwc';

const IDEATION_OPTIONS = [
    { label: 'None', value: 'None' },
    { label: 'Passive', value: 'Passive' },
    { label: 'Active - No Plan', value: 'Active - No Plan' },
    { label: 'Active - With Plan', value: 'Active - With Plan' },
    { label: 'Unknown', value: 'Unknown' }
];

const STORAGE_KEY_PREFIX = 'gpCaseViolenceDraft_';
const STORAGE_BASE_KEY = `${STORAGE_KEY_PREFIX}draft`;

export default class GpCaseStepSafetyViolence extends LightningElement {
    @api errors = {};
    @api caseId;

    ideation = '';
    recentViolence = false;
    weaponsAccess = false;
    violenceDetails = '';

    get ideationOptions() {
        return IDEATION_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.ideation
        }));
    }

    get showDetail() {
        return this.ideation && this.ideation !== 'None';
    }

    get ideationError() {
        return this.errors?.Homicidal_Ideation__c;
    }

    get violenceDetailsError() {
        return this.errors?.Violence_Details__c;
    }

    @api
    focusFirstError(errorPath) {
        if (errorPath === 'Homicidal_Ideation__c') {
            const field = this.template.querySelector('#ideation');
            if (field && field.focus) {
                field.focus();
            }
            return;
        }
        if (errorPath === 'Violence_Details__c') {
            const field = this.template.querySelector('#violence-details');
            if (field && field.focus) {
                field.focus();
            }
        }
    }

    @api
    set data(value) {
        const source = { ...(this.readDraft() || {}), ...(value || {}) };
        this.ideation = source.Homicidal_Ideation__c || source.homicidalIdeationDraft || '';
        this.recentViolence = this.normalizeBoolean(
            source.Violence_Recent__c,
            source.violenceRecentDraft
        );
        this.weaponsAccess = this.normalizeBoolean(
            source.Weapons_Access__c,
            source.weaponsAccessDraft
        );
        this.violenceDetails = source.Violence_Details__c || source.violenceDetailsDraft || '';
    }

    get data() {
        return this.buildPayload();
    }

    handleIdeationChange(event) {
        this.ideation = event.target.value;
        if (!this.showDetail) {
            this.weaponsAccess = '';
            this.violenceDetails = '';
        }
        this.emitDraftChange();
    }

    handleCheckboxChange(event) {
        this.recentViolence = event.target.checked;
        this.emitDraftChange();
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value;
        if (!field) return;

        if (field === 'Weapons_Access__c') {
            this.weaponsAccess = value;
        } else if (field === 'Violence_Details__c') {
            this.violenceDetails = value;
        }
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
        const payload = this.buildPayload();
        this.persistDraft(payload);
        this.dispatchEvent(new CustomEvent('dataupdated', {
            detail: payload
        }));
    }

    buildPayload() {
        const access = this.normalizeBoolean(this.weaponsAccess);
        const details = (this.violenceDetails || '').trim();
        return {
            Homicidal_Ideation__c: this.ideation || null,
            Violence_Recent__c: this.normalizeBoolean(this.recentViolence),
            Weapons_Access__c: this.showDetail ? access : null,
            Violence_Details__c: this.showDetail ? (details || null) : null,
            homicidalIdeationDraft: this.ideation,
            violenceRecentDraft: this.recentViolence,
            weaponsAccessDraft: access,
            violenceDetailsDraft: details
        };
    }

    normalizeBoolean(value, draftValue) {
        const incoming = value !== null && typeof value !== 'undefined' ? value : draftValue;
        if (incoming === true || incoming === 'true') return true;
        if (incoming === false || incoming === 'false' || incoming === null || typeof incoming === 'undefined') return false;
        return Boolean(incoming);
    }

    get storageKey() {
        return this.caseId ? `${STORAGE_KEY_PREFIX}${this.caseId}` : STORAGE_BASE_KEY;
    }

    persistDraft(payload) {
        try {
            if (typeof window === 'undefined') return;
            const key = this.storageKey;
            window.localStorage.setItem(key, JSON.stringify(payload));
            if (this.caseId) {
                window.localStorage.removeItem(STORAGE_BASE_KEY);
            }
        } catch (e) {
            // storage might be unavailable; fail silently
        }
    }

    readDraft() {
        try {
            if (typeof window === 'undefined') return null;
            const keys = this.caseId
                ? [`${STORAGE_KEY_PREFIX}${this.caseId}`, STORAGE_BASE_KEY]
                : [STORAGE_BASE_KEY];
            for (const key of keys) {
                const raw = window.localStorage.getItem(key);
                if (raw) {
                    return JSON.parse(raw);
                }
            }
        } catch (e) {
            // ignore JSON/storage errors
        }
        return null;
    }
}