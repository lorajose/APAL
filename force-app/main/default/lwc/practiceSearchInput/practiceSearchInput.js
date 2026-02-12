import { LightningElement, api, track } from 'lwc';
import searchPractices from '@salesforce/apex/PracticeSearchController.searchPractices';
import getPracticeRecordTypeId from '@salesforce/apex/PracticeSearchController.getPracticeRecordTypeId';
import getLastCreatedPractice from '@salesforce/apex/PracticeSearchController.getLastCreatedPractice';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PracticeSearchInput extends NavigationMixin(LightningElement) {
  // ⚙️ Variables públicas
  @api selectedPracticeId;
  @api selectedPracticeOutput;
  @api practiceRecordTypeId; // Mantenemos esta prop para la navegación
  @api practiceId; // Flujo Output variable

  // 🧠 Estado interno
  @track searchKey = '';
  @track practices = [];
  @track showLoading = false;
  @track isDropdownOpen = false;
  isServiceConsole = false;
  saveListenerAttached = false;

  get comboboxClass() {
    return `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${this.isDropdownOpen ? 'slds-is-open' : ''}`;
  }

  get isInputFilled() {
    return this.searchKey && this.searchKey.trim() !== '';
  }
  
  get isButtonDisabled() {
    return !this.isInputFilled;
  }

  // 🔑 Clave única por tab y registro
  get storageKey() {
    const tabKey = window.name || 'mainTab';
    const recordKey = this.practiceId || 'newCase'; 
    return `practice_${tabKey}_${recordKey}`; // Cambiado a 'practice_'
  }

  connectedCallback() {
    console.log('🧩 practiceSearchInput conectado con persistencia robusta');
    this.initRecordType(); // Cargar el Record Type ID

    const url = window.location.href.toLowerCase();
    const isNewCase =
      url.includes('/new') || url.includes('/newcase') || url.includes('/case/create');

    // --- USANDO CLAVES ESPECÍFICAS PARA EVITAR CONFLICTOS CON OTROS COMPONENTES ---
    const pendingSave = localStorage.getItem(this.storageKey + '_pendingSave');
    const lastAttempt = localStorage.getItem(this.storageKey + '_lastSaveAttempt');

    // ⏱️ Solo consideramos intentos dentro de los últimos 10 segundos
    const validAttempt =
      pendingSave && lastAttempt && Date.now() - parseInt(lastAttempt, 10) < 10000;

    const saved = localStorage.getItem(this.storageKey);

    // ♻️ Caso 1: intento previo detectado
    if (validAttempt && saved) {
        const parsed = JSON.parse(saved);
        
        // Asumimos que hubo un error y restauramos el valor
        this.selectedPracticeId = parsed.id;
        this.searchKey = parsed.name;
        console.log('⚠️ Intento de guardado detectado → se conserva Practice:', parsed.name);

        // Eliminamos las banderas ESPECÍFICAS inmediatamente después de restaurar.
        localStorage.removeItem(this.storageKey + '_pendingSave');
        localStorage.removeItem(this.storageKey + '_lastSaveAttempt');
        
        return; 
    }
    
    // ♻️ Caso 2: recarga normal o error previo persistente
    if (saved && !validAttempt) {
      const parsed = JSON.parse(saved);
      this.selectedPracticeId = parsed.id;
      this.searchKey = parsed.name;
      console.log('♻️ Restaurado Practice persistente:', parsed.name);
    }

    // 🆕 Caso nuevo → limpiar
    if (isNewCase && !validAttempt) {
      this.clearSelection();
      console.log('🆕 Nuevo Case → limpio inicial');
    }

    // 💾 Detectar intento de guardado (Save / Guardar)
    if (!this.saveListenerAttached) {
        document.addEventListener('click', (e) => {
            const label = (e.target.innerText || '').toLowerCase();
            if (label.includes('save') || label.includes('guardar')) {
                console.log('💾 Intento de guardar detectado');
                // Guardamos el estado ANTES del intento de guardado
                if (this.searchKey && this.selectedPracticeId) {
                   localStorage.setItem(
                        this.storageKey,
                        JSON.stringify({ id: this.selectedPracticeId, name: this.searchKey })
                    );
                   // Establecemos las banderas ESPECÍFICAS
                    localStorage.setItem(this.storageKey + '_pendingSave', 'true');
                    localStorage.setItem(this.storageKey + '_lastSaveAttempt', Date.now().toString());
                    console.log('📦 Guardado temporal de Practice antes del intento:', this.searchKey);
                } else {
                    localStorage.removeItem(this.storageKey); 
                }
            }
        });
        this.saveListenerAttached = true;
    }

    // 🚫 No limpiar al cambiar de tab en Service Console
    this.isServiceConsole = window.location.href.includes('console');
    if (!this.isServiceConsole) {
      window.addEventListener('beforeunload', () => {
        console.log('🔁 Cierre completo → limpieza');
        localStorage.removeItem(this.storageKey);
        // Limpiar también las banderas específicas al cierre completo del navegador
        localStorage.removeItem(this.storageKey + '_pendingSave');
        localStorage.removeItem(this.storageKey + '_lastSaveAttempt');
      });
    }
  }

  // 📦 RecordTypeId: Método para cargar el RT ID (específico de Practice)
  async initRecordType() {
    try {
        this.practiceRecordTypeId = await getPracticeRecordTypeId();
    } catch (err) {
        console.error('Error fetching Practice RecordTypeId', err);
    }
  }

  // Métodos necesarios para el HTML del lookup:
  handleFocus() {
    if (this.practices.length > 0 || this.searchKey.length >= 2) {
        this.isDropdownOpen = true;
    }
  }

  handleBlur() {
    setTimeout(() => {
        this.isDropdownOpen = false;
    }, 300);
  }

  // 🔍 Buscar prácticas
  handleSearchChange(event) {
    this.searchKey = event.target.value;
    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPractices({ searchKey: this.searchKey })
        .then((result) => (this.practices = result))
        .catch((error) => console.error('❌ Error searching practices:', error))
        .finally(() => (this.showLoading = false));
    } else {
      this.isDropdownOpen = false;
      this.practices = [];
    }
  }

  // 🖱️ Seleccionar práctica
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    this.selectedPracticeId = id;
    this.selectedPracticeOutput = name;
    this.searchKey = name;
    this.isDropdownOpen = false;
    this.practices = [];

    // Guardamos en localStorage al seleccionar
    localStorage.setItem(this.storageKey, JSON.stringify({ id, name }));
    console.log(`✅ Practice "${name}" guardado en ${this.storageKey}`);

    // Notificar al Flow
    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', id));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', name));

    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${name}" selected.`,
        variant: 'success'
      })
    );
  }

  // ❌ Limpieza completa
  clearSelection() {
    this.selectedPracticeId = null;
    this.selectedPracticeOutput = null;
    this.searchKey = '';
    this.practices = [];
    this.isDropdownOpen = false;
    localStorage.removeItem(this.storageKey);
     // Limpiar también las banderas específicas al limpiar manualmente
    localStorage.removeItem(this.storageKey + '_pendingSave');
    localStorage.removeItem(this.storageKey + '_lastSaveAttempt');
    console.log(`🧹 Limpieza ejecutada (${this.storageKey})`);
  }
  
  // ➕ Crear nueva práctica (específico de PracticeSearchInput)
  handleNewPractice() {
    this.showLoading = true;
    this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
            objectApiName: 'Account', // Asumiendo que la práctica es un Account
            actionName: 'new'
        },
        state: {
            recordTypeId: this.practiceRecordTypeId || null,
            navigationLocation: 'RELATED_LIST',
            useRecordTypeCheck: 1
        }
    });

    // Esperar y recuperar la última práctica creada (esto depende de Apex)
    setTimeout(() => {
        getLastCreatedPractice()
            .then((practice) => {
                if (practice && practice.Id) {
                    this.addNewPractice(practice);
                }
            })
            .catch((err) => console.error('Error al obtener nueva Practice:', err))
            .finally(() => (this.showLoading = false));
    }, 2500);
  }

  // 🧩 Auto-rellenar tras crear nueva práctica (específico de PracticeSearchInput)
  @api
  addNewPractice(newPractice) {
    if (!newPractice || !newPractice.Id) return;
    this.selectedPracticeId = newPractice.Id;
    this.searchKey = newPractice.Name;
    this.isDropdownOpen = false;
    this.showLoading = false;

    // Guarda en localStorage al seleccionar
    localStorage.setItem(this.storageKey, JSON.stringify({ id: newPractice.Id, name: newPractice.Name }));

    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', newPractice.Id));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', newPractice.Name));

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Practice Selected',
            message: `"${newPractice.Name}" created y selected.`,
            variant: 'success'
        })
    );
    console.log('🆕 Practice created y selected:', newPractice.Name);
  }
}