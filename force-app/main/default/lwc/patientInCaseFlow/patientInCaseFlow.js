import { LightningElement, api } from 'lwc';
import getPatientById from '@salesforce/apex/PatientSearchController.getPatientById';
import getPatientByCaseId from '@salesforce/apex/PatientSearchController.getPatientByCaseId';

export default class PatientInCaseFlow extends LightningElement {
    @api
    get patientId() {
        return this._patientId;
    }
    set patientId(value) {
        this._patientId = value;
        this._maybeInitFromPatientId();
    }

    @api
    get patientRecord() {
        return this._patientRecord;
    }
    set patientRecord(value) {
        this._patientRecord = value;
        if (value && value.Id) {
            this._maybeInitFromPatientRecord(value);
        }
    }
    @api isFromFlow;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this._maybeInitFromRecordId();
    }

    @api
    get objectApiName() {
        return this._objectApiName;
    }
    set objectApiName(value) {
        this._objectApiName = value;
        this._maybeInitFromRecordId();
    }

    _initializedFromRecordId = false;
    _initializedFromPatientId = false;
    _initializedFromPatientRecord = false;
    _patientId;
    _patientRecord;
    _recordId;
    _objectApiName;
    

    handleValueChange(event) {
        this._patientId = event.detail.patientId;
        this._patientRecord = event.detail.patientRecord;
    }

    handleClearSelection() {
        this._patientId = null;
        this._patientRecord = null;
    }

    handleInitialPopulate() {
        if (this._patientId) {
            const searchInput = this.template.querySelector('c-patient-search-input');
            if (searchInput && typeof searchInput.setPreSelectedPatient === 'function') {
                searchInput.setPreSelectedPatient(this._patientId);
            }
        } else {
            this.handleClearSelection();
        }
    }

    renderedCallback() {
        this._maybeInitFromRecordId();
    }

    // 🔄 Se ejecuta al terminar el Flow del modal
    finishAction = async ({ outputVariables }) => {
        console.log('🎯 finishAction outputVariables:', JSON.stringify(outputVariables));

        const searchInput = this.template.querySelector('c-patient-search-input');
        if (!outputVariables || outputVariables.length === 0) return;

        let recordId;
        let recordObject;

        // 🧩 Detectar qué variable vino del Flow
        for (const outputVar of outputVariables) {
            if (outputVar.name === 'patientRecordId' && outputVar.value) {
                recordId = outputVar.value;
            }
            if (outputVar.name === 'patientRecord' && outputVar.value) {
                recordObject = outputVar.value;
            }
        }

        // 🧠 Caso 1: el Flow devolvió todo el record
        if (recordObject && recordObject.Id) {
            console.log('🆕 Nuevo Patient recibido desde Flow:', recordObject);
            this._applyNewPatient(recordObject, searchInput);
            return;
        }

        // 🧠 Caso 2: el Flow solo devolvió el ID (lo más común)
        if (recordId && !recordObject) {
            console.log('📥 Obteniendo Patient desde Apex con Id:', recordId);

            try {
                const patient = await getPatientById({ patientId: recordId });
                console.log('✅ Patient recuperado:', patient);
                if (patient) {
                    this._applyNewPatient(patient, searchInput);
                }
            } catch (error) {
                console.error('❌ Error al obtener Patient por Id:', error);
            }
        }
    };

    // 🧩 Función reutilizable para aplicar el nuevo Patient
    _applyNewPatient(patient, searchInput) {
        this.patientRecord = patient;
        this.patientId = patient.Id;

        // 🔁 Autocompletar el input
        setTimeout(() => {
            if (searchInput && typeof searchInput.addNewPatient === 'function') {
                searchInput.addNewPatient(patient);
            }
        }, 150);

        // 🔊 Notificar al Flow padre
        this.dispatchEvent(
            new CustomEvent('patientselected', {
                detail: {
                    patientId: patient.Id,
                    patientRecord: patient
                },
                bubbles: true,
                composed: true
            })
        );

        console.log(`✨ Patient autocompletado: ${patient.Name}`);
    }

    _isContactContext() {
        if (this._objectApiName) {
            return this._objectApiName === 'Contact';
        }
        return typeof this._recordId === 'string' && this._recordId.startsWith('003');
    }

    _isCaseContext() {
        if (this._objectApiName) {
            return this._objectApiName === 'Case';
        }
        return typeof this._recordId === 'string' && this._recordId.startsWith('500');
    }

    async _populateFromRecordId(recordId) {
        const searchInput = this.template.querySelector('c-patient-search-input');
        try {
            const patient = await getPatientById({ patientId: recordId });
            if (patient) {
                this._applyNewPatient(patient, searchInput);
            }
        } catch (error) {
            console.error('❌ Error al obtener Patient por Id:', error);
        }
    }

    async _populateFromCaseId(recordId) {
        const searchInput = this.template.querySelector('c-patient-search-input');
        try {
            const patient = await getPatientByCaseId({ caseId: recordId });
            if (patient) {
                this._applyNewPatient(patient, searchInput);
            }
        } catch (error) {
            console.error('❌ Error al obtener Patient por Case Id:', error);
        }
    }

    _maybeInitFromRecordId() {
        if (this._initializedFromRecordId) return;
        if (this._patientId) return;
        if (!this._recordId) {
            const inferredId = this._getContactIdFromUrl();
            if (inferredId) {
                this._recordId = inferredId;
            } else {
                return;
            }
        }
        this._initializedFromRecordId = true;
        if (this._isContactContext()) {
            this._populateFromRecordId(this._recordId);
        } else if (this._isCaseContext()) {
            this._populateFromCaseId(this._recordId);
        }
    }

    _maybeInitFromPatientId() {
        if (this._initializedFromPatientId) return;
        if (!this._patientId) return;
        if (this._patientRecord && this._patientRecord.Id) {
            this._maybeInitFromPatientRecord(this._patientRecord);
            return;
        }
        this._initializedFromPatientId = true;
        if (typeof this._patientId === 'string' && this._patientId.startsWith('500')) {
            this._populateFromCaseId(this._patientId);
        } else {
            this._populateFromRecordId(this._patientId);
        }
    }

    _maybeInitFromPatientRecord(record) {
        if (this._initializedFromPatientRecord) return;
        if (!record || !record.Id) return;
        this._initializedFromPatientRecord = true;
        const searchInput = this.template.querySelector('c-patient-search-input');
        this._applyNewPatient(record, searchInput);
    }

    _getContactIdFromUrl() {
        try {
            const href = window.location.href;
            const directMatch = href.match(/\/Contact\/([a-zA-Z0-9]{15,18})/);
            if (directMatch) {
                return directMatch[1];
            }

            const fromParams = this._getIdFromUrlParams();
            if (fromParams) {
                return fromParams;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    _getIdFromUrlParams() {
        const href = window.location.href;
        const params = new URL(href).searchParams;
        const candidates = [
            params.get('recordId'),
            params.get('c__recordId'),
            params.get('c__contextId'),
            params.get('c__contactId')
        ].filter((val) => val);
        for (const val of candidates) {
            if (typeof val === 'string' && val.startsWith('003')) {
                return val;
            }
        }

        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) {
            const hash = href.slice(hashIndex + 1);
            const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);
            const hashCandidates = [
                hashParams.get('recordId'),
                hashParams.get('c__recordId'),
                hashParams.get('c__contextId'),
                hashParams.get('c__contactId')
            ].filter((val) => val);
            for (const val of hashCandidates) {
                if (typeof val === 'string' && val.startsWith('003')) {
                    return val;
                }
            }
        }
        return null;
    }
}