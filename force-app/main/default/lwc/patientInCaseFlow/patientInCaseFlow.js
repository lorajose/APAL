import { LightningElement, api } from 'lwc';
import getPatientById from '@salesforce/apex/PatientSearchController.getPatientById';

export default class PatientInCaseFlow extends LightningElement {
    @api patientId;
    @api patientRecord;
    @api isFromFlow;

    handleValueChange(event) {
        this.patientId = event.detail.patientId;
        this.patientRecord = event.detail.patientRecord;
    }

    handleClearSelection() {
        this.patientId = null;
        this.patientRecord = null;
    }

    handleInitialPopulate() {
        if (this.patientId) {
            const searchInput = this.template.querySelector('c-patient-search-input');
            if (searchInput && typeof searchInput.setPreSelectedPatient === 'function') {
                searchInput.setPreSelectedPatient(this.patientId);
            }
        } else {
            this.handleClearSelection();
        }
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
}