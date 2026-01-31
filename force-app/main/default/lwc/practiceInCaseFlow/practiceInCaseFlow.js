import { LightningElement, api } from 'lwc';
import getPracticeById from '@salesforce/apex/PracticeSearchController.getPracticeById';
import getPracticeByCaseId from '@salesforce/apex/PracticeSearchController.getPracticeByCaseId';

export default class PracticeInCaseFlow extends LightningElement {
    @api isFromFlow;

    @api
    get practiceId() {
        return this._practiceId;
    }
    set practiceId(value) {
        this._practiceId = value;
        this._maybeInitFromPracticeId();
    }

    @api
    get practiceRecord() {
        return this._practiceRecord;
    }
    set practiceRecord(value) {
        this._practiceRecord = value;
        if (value && value.Id) {
            this._maybeInitFromPracticeRecord(value);
        }
    }

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

    _practiceId;
    _practiceRecord;
    _recordId;
    _objectApiName;
    _initializedFromRecordId = false;
    _initializedFromPracticeId = false;
    _initializedFromPracticeRecord = false;

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
        console.log('🎯 Practice sincronizado desde modal:', practiceRecord.Name);
    }
}

    handleValueChange(event) {
        this._practiceId = event.detail.practiceId;
        this._practiceRecord = event.detail.practiceRecord;
    }
    // 🧹 Limpieza manual
handleClearSelection() {
this._practiceId = null;
this._practiceRecord = null;
}

  handleInitialPopulate() {
        if (this._practiceId) {
            this._maybeInitFromPracticeId();
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
/* _applyNewPractice(practice, searchInput) {
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
} */

    _applyNewPractice(practice, searchInput) {
    this._practiceRecord = practice;
    this._practiceId = practice.Id;

    // Esperar al DOM antes de autocompletar
    setTimeout(() => {
        try {
            const input = this.template.querySelector('c-practice-search-input');
            if (input && typeof input.addNewPractice === 'function') {
                input.addNewPractice(practice);
                console.log(`✨ Practice autocompletado: ${practice.Name}`);
            } else {
                console.warn('⚠️ El componente de búsqueda no está disponible aún.');
            }

            // 🔊 Evento global o LMS
            window.dispatchEvent(new CustomEvent('practicecreated', {
                detail: { practiceId: practice.Id, practiceRecord: practice }
            }));

            // 📩 Notificar al Flow padre
      // eslint-disable-next-line no-undef
      if (typeof FlowAttributeChangeEvent !== 'undefined') {
          this.dispatchEvent(new FlowAttributeChangeEvent('practiceRecord', this._practiceRecord));
          this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', this._practiceId));
      }

      console.log('📩 Flow principal actualizado con nuevo Practice.');


        } catch (e) {
            console.error('❌ Error al autocompletar el practice:', e);
        }
    }, 400); // pequeño delay para asegurar que el Flow modal cerró
}

    renderedCallback() {
        this._maybeInitFromRecordId();
    }

    _isAccountContext() {
        if (this._objectApiName) {
            return this._objectApiName === 'Account';
        }
        return typeof this._recordId === 'string' && this._recordId.startsWith('001');
    }

    _isCaseContext() {
        if (this._objectApiName) {
            return this._objectApiName === 'Case';
        }
        return typeof this._recordId === 'string' && this._recordId.startsWith('500');
    }

    async _populateFromRecordId(recordId) {
        const searchInput = this.template.querySelector('c-practice-search-input');
        try {
            const practice = await getPracticeById({ practiceId: recordId });
            if (practice) {
                this._applyNewPractice(practice, searchInput);
            }
        } catch (error) {
            console.error('❌ Error al obtener Practice por Id:', error);
        }
    }

    async _populateFromCaseId(recordId) {
        const searchInput = this.template.querySelector('c-practice-search-input');
        try {
            const practice = await getPracticeByCaseId({ caseId: recordId });
            if (practice) {
                this._applyNewPractice(practice, searchInput);
            }
        } catch (error) {
            console.error('❌ Error al obtener Practice por Case Id:', error);
        }
    }

    _maybeInitFromRecordId() {
        if (this._initializedFromRecordId) return;
        if (this._practiceId) return;
        if (!this._recordId) {
            const inferredId = this._getAccountIdFromUrl();
            if (inferredId) {
                this._recordId = inferredId;
            } else {
                return;
            }
        }
        this._initializedFromRecordId = true;
        if (this._isAccountContext()) {
            this._populateFromRecordId(this._recordId);
        } else if (this._isCaseContext()) {
            this._populateFromCaseId(this._recordId);
        }
    }

    _maybeInitFromPracticeId() {
        if (this._initializedFromPracticeId) return;
        if (!this._practiceId) return;
        if (this._practiceRecord && this._practiceRecord.Id) {
            this._maybeInitFromPracticeRecord(this._practiceRecord);
            return;
        }
        this._initializedFromPracticeId = true;
        if (typeof this._practiceId === 'string' && this._practiceId.startsWith('500')) {
            this._populateFromCaseId(this._practiceId);
        } else {
            this._populateFromRecordId(this._practiceId);
        }
    }

    _maybeInitFromPracticeRecord(record) {
        if (this._initializedFromPracticeRecord) return;
        if (!record || !record.Id) return;
        this._initializedFromPracticeRecord = true;
        const searchInput = this.template.querySelector('c-practice-search-input');
        this._applyNewPractice(record, searchInput);
    }

    _getAccountIdFromUrl() {
        try {
            const href = window.location.href;
            const directMatch = href.match(/\/Account\/([a-zA-Z0-9]{15,18})/);
            if (directMatch) {
                return directMatch[1];
            }
            const params = new URL(href).searchParams;
            const candidates = [
                params.get('recordId'),
                params.get('c__recordId'),
                params.get('c__contextId'),
                params.get('c__accountId')
            ].filter((val) => val);
            for (const val of candidates) {
                if (typeof val === 'string' && val.startsWith('001')) {
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
                    hashParams.get('c__accountId')
                ].filter((val) => val);
                for (const val of hashCandidates) {
                    if (typeof val === 'string' && val.startsWith('001')) {
                        return val;
                    }
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
  
}