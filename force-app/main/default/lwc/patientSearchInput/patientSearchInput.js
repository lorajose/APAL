import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import searchPatients from '@salesforce/apex/PatientSearchController.searchPatients';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PatientSearchInput extends LightningElement {
  // ⚙️ Variables públicas
  @api selectedPatientId;
  @api selectedPatientOutput;
  @api patientId;

  // 🧠 Estado interno
  @track searchKey = '';
  @track patients = [];
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
    const recordKey = this.patientId || 'newCase';
    return `patient_${tabKey}_${recordKey}`;
  }

  connectedCallback() {
    console.log('🧩 patientSearchInput conectado con persistencia robusta');

    const url = window.location.href.toLowerCase();
    const isNewCase =
      url.includes('/new') || url.includes('/newcase') || url.includes('/case/create');

    const pendingSave = localStorage.getItem('pendingSave');
    const lastAttempt = localStorage.getItem('lastSaveAttempt');

    // ⏱️ Solo consideramos intentos dentro de los últimos 10 segundos
    const validAttempt =
      pendingSave && lastAttempt && Date.now() - parseInt(lastAttempt, 10) < 10000;

    const saved = localStorage.getItem(this.storageKey);

    // ♻️ Caso 1: intento previo detectado
    if (validAttempt && saved) {
        const parsed = JSON.parse(saved);
        
        // Asumimos que hubo un error (ya que estamos aquí después de un "Save" reciente)
        // y restauramos el valor SIN intentar detectar errores en el DOM.
        this.selectedPatientId = parsed.id;
        this.searchKey = parsed.name;
        console.log('⚠️ Intento de guardado detectado → se conserva Patient:', parsed.name);

        // Eliminamos las banderas inmediatamente después de restaurar.
        localStorage.removeItem('pendingSave');
        localStorage.removeItem('lastSaveAttempt');
        
        // SI EL CAMPO DEBE LIMPIARSE TRAS UN GUARDADO EXITOSO, 
        // NECESITAS OTRA FORMA DE SABER SI EL GUARDADO FUE EXITOSO (e.g., parámetro de URL de éxito).
        // Por ahora, siempre restaurará si se hizo clic en guardar recientemente.
        return; 
    }
    
    // ♻️ Caso 2: recarga normal o error previo persistente
    if (saved && !validAttempt) {
      const parsed = JSON.parse(saved);
      this.selectedPatientId = parsed.id;
      this.searchKey = parsed.name;
      console.log('♻️ Restaurado Patient persistente:', parsed.name);
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
                if (this.searchKey && this.selectedPatientId) {
                   localStorage.setItem(
                        this.storageKey,
                        JSON.stringify({ id: this.selectedPatientId, name: this.searchKey })
                    );
                    localStorage.setItem('pendingSave', 'true');
                    localStorage.setItem('lastSaveAttempt', Date.now().toString());
                    console.log('📦 Guardado temporal de Patient antes del intento:', this.searchKey);
                } else {
                    // Si no hay nada seleccionado, no hay nada que persistir en caso de error
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
      });
    }
  }

  // Métodos handleFocus, handleBlur, handleSearchChange, handleSelect, clearSelection y getters permanecen iguales.
  // ... (copia los métodos de la respuesta anterior aquí) ...
  
  handleFocus() {
    if (this.patients.length > 0 || this.searchKey.length >= 2) {
        this.isDropdownOpen = true;
    }
  }

  handleBlur() {
    setTimeout(() => {
        this.isDropdownOpen = false;
    }, 300);
  }

  handleSearchChange(event) {
    this.searchKey = event.target.value;
    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPatients({ searchKey: this.searchKey })
        .then((result) => (this.patients = result))
        .catch((error) => console.error('❌ Error searching patients:', error))
        .finally(() => (this.showLoading = false));
    } else {
      this.isDropdownOpen = false;
      this.patients = [];
    }
  }

  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    this.selectedPatientId = id;
    this.selectedPatientOutput = name;
    this.searchKey = name;
    this.isDropdownOpen = false;
    this.patients = [];

    localStorage.setItem(this.storageKey, JSON.stringify({ id, name }));
    console.log(`✅ Patient "${name}" guardado en ${this.storageKey}`);

    this.dispatchEvent(new FlowAttributeChangeEvent('patientId', id));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPatientOutput', name));

    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Patient Selected',
        message: `"${name}" seleccionado.`,
        variant: 'success'
      })
    );
  }

  clearSelection() {
    this.selectedPatientId = null;
    this.selectedPatientOutput = null;
    this.searchKey = '';
    this.patients = [];
    this.isDropdownOpen = false;
    localStorage.removeItem(this.storageKey);
    console.log(`🧹 Limpieza ejecutada (${this.storageKey})`);
  }
}