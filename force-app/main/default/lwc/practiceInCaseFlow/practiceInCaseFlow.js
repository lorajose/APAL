import { LightningElement, api } from 'lwc';
import getPracticeById from '@salesforce/apex/PracticeSearchController.getPracticeById';

export default class PracticeInCaseFlow extends LightningElement {
@api practiceRecord;
@api isFromFlow;
@api practiceId;

connectedCallback() {
    window.addEventListener('practiceselected', this.handlePracticeSelected.bind(this));
}

disconnectedCallback() {
    window.removeEventListener('practiceselected', this.handlePracticeSelected.bind(this));
}

handlePracticeSelected(event) {
    const { practiceId, practiceRecord } = event.detail;
    console.log('📡 Recibido desde modal New Provider:', practiceId, practiceRecord);

    const searchInput = this.template.querySelector('c-practice-search-input');
    if (searchInput && typeof searchInput.addNewPractice === 'function') {
        searchInput.addNewPractice(practiceRecord);
    }
}

    handleValueChange(event) {
        this.practiceId = event.detail.practiceId;
        this.practiceRecord = event.detail.practiceRecord;
    }
    // 🧹 Limpieza manual
handleClearSelection() {
this.practiceId = null;
this.practiceRecord = null;
}

  handleInitialPopulate() {
        if (this.practiceId) {
            const searchInput = this.template.querySelector('c-practice-search-input');
            if (searchInput && typeof searchInput.setPreSelectedPatient === 'function') {
                searchInput.setPreSelectedPatient(this.practiceId);
            }
        } else {
            this.handleClearSelection();
        }
    }


// 🔄 Se ejecuta al terminar el Flow del modal
finishAction = async ({ outputVariables }) => {
    console.log('🎯 finishAction outputVariables:', JSON.stringify(outputVariables));

    const searchInput = this.template.querySelector('c-practice-search-input');
    if (!outputVariables || outputVariables.length === 0) return;

    let recordId;
    let recordObject;

    // 🧩 Detectar qué variable vino del Flow
    for (const outputVar of outputVariables) {
        if (outputVar.name === 'practiceRecordId' && outputVar.value) {
            recordId = outputVar.value;
        }
        if (outputVar.name === 'practiceRecord' && outputVar.value) {
            recordObject = outputVar.value;
        }
    }

    // 🧠 Caso 1: el Flow devolvió todo el record
    if (recordObject && recordObject.Id) {
        console.log('🆕 Nuevo Practice recibido desde Flow:', recordObject);
        this._applyNewPractice(recordObject, searchInput);
        return;
    }

    // 🧠 Caso 2: el Flow solo devolvió el ID (lo más común)
    if (recordId && !recordObject) {
        console.log('📥 Obteniendo Practice desde Apex con Id:', recordId);

        try {
            const practice = await getPracticeById({ practiceId: recordId });
            console.log('✅ Practice recuperado:', practice);
            if (practice) {
                this._applyNewPractice(practice, searchInput);
            }
        } catch (error) {
            console.error('❌ Error al obtener Practice por Id:', error);
        }
    }
};

// 🧩 Función reutilizable para aplicar el nuevo Practice
_applyNewPractice(practice, searchInput) {
    this.practiceRecord = practice;
    this.practiceId = practice.Id;

    // 🔁 Autocompletar el input
    setTimeout(() => {
        if (searchInput && typeof searchInput.addNewPractice === 'function') {
            searchInput.addNewPractice(practice);
        }
    }, 150);

    // 🔊 Notificar al Flow padre
    this.dispatchEvent(
        new CustomEvent('practiceselected', {
            detail: {
                practiceId: practice.Id,
                practiceRecord: practice
            },
            bubbles: true,
            composed: true
        })
    );

    console.log(`✨ Practice autocompletado: ${practice.Name}`);
}
}