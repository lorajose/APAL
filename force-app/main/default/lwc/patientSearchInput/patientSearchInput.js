import { LightningElement, api, track } from "lwc";
import searchPatients from "@salesforce/apex/PatientSearchController.searchPatients";
import getLastCreatedPatient from "@salesforce/apex/PatientSearchController.getLastCreatedPatient";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class PatientSearchInput extends NavigationMixin(
  LightningElement
) {
  // ⚙️ Variables públicas
  @api selectedPatientId;
  @api selectedPatientOutput;
  @api patientId; // Flujo Output variable

  // 🧠 Estado interno
  @track searchKey = "";
  @track patients = [];
  @track showLoading = false;
  @track isDropdownOpen = false;
  isServiceConsole = false;
  saveListenerAttached = false;
  lastToastKey;
  lastToastAt = 0;

  // 🎨 CSS dinámico para el combobox
  get comboboxClass() {
    return `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${
      this.isDropdownOpen ? "slds-is-open" : ""
    }`;
  }

  get isInputFilled() {
    return this.searchKey && this.searchKey.trim() !== "";
  }

  get isButtonDisabled() {
    return !this.isInputFilled;
  }

  // 🔑 Clave única por tab y registro (para persistencia)
  get storageKey() {
    const tabKey = window.name || "mainTab";
    const recordKey = this.patientId || "newCase";
    return `patient_${tabKey}_${recordKey}`;
  }

  // 🧩 Inicialización
  connectedCallback() {
    console.log("🧩 patientSearchInput conectado con persistencia robusta");

    const url = window.location.href.toLowerCase();
    const isNewCase =
      url.includes("/new") ||
      url.includes("/newcase") ||
      url.includes("/case/create");

    // --- Claves específicas (para evitar conflicto entre componentes) ---
    const pendingSave = localStorage.getItem(this.storageKey + "_pendingSave");
    const lastAttempt = localStorage.getItem(
      this.storageKey + "_lastSaveAttempt"
    );

    const validAttempt =
      pendingSave &&
      lastAttempt &&
      Date.now() - parseInt(lastAttempt, 10) < 10000;

    const saved = localStorage.getItem(this.storageKey);

    // ♻️ Caso 1: intento previo de guardado
    if (validAttempt && saved) {
      const parsed = JSON.parse(saved);
      this.selectedPatientId = parsed.id;
      this.searchKey = parsed.name;
      console.log(
        "⚠️ Intento de guardado detectado → se conserva Patient:",
        parsed.name
      );
      localStorage.removeItem(this.storageKey + "_pendingSave");
      localStorage.removeItem(this.storageKey + "_lastSaveAttempt");
      return;
    }

    // ♻️ Caso 2: restaurar valor persistente previo
    if (saved && !validAttempt) {
      const parsed = JSON.parse(saved);
      this.selectedPatientId = parsed.id;
      this.searchKey = parsed.name;
      console.log("♻️ Restaurado Patient persistente:", parsed.name);
    }

    // 🆕 Caso nuevo → limpiar
    if (isNewCase && !validAttempt) {
      this.clearSelection();
      console.log("🆕 Nuevo Case → limpio inicial");
    }

    // 💾 Detectar intento de guardado
    if (!this.saveListenerAttached) {
      document.addEventListener("click", (e) => {
        const label = (e.target.innerText || "").toLowerCase();
        if (label.includes("save") || label.includes("guardar")) {
          console.log("💾 Intento de guardar detectado");
          if (this.searchKey && this.selectedPatientId) {
            localStorage.setItem(
              this.storageKey,
              JSON.stringify({
                id: this.selectedPatientId,
                name: this.searchKey
              })
            );
            localStorage.setItem(this.storageKey + "_pendingSave", "true");
            localStorage.setItem(
              this.storageKey + "_lastSaveAttempt",
              Date.now().toString()
            );
            console.log(
              "📦 Guardado temporal de Patient antes del intento:",
              this.searchKey
            );
          } else {
            localStorage.removeItem(this.storageKey);
          }
        }
      });
      this.saveListenerAttached = true;
    }

    // 🚫 No limpiar en Service Console
    this.isServiceConsole = window.location.href.includes("console");
    if (!this.isServiceConsole) {
      window.addEventListener("beforeunload", () => {
        console.log("🔁 Cierre completo → limpieza");
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.storageKey + "_pendingSave");
        localStorage.removeItem(this.storageKey + "_lastSaveAttempt");
      });
    }
  }

  // 🧭 Métodos del lookup

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

  // 🔍 Buscar pacientes
  handleSearchChange(event) {
    this.searchKey = event.target.value;
    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPatients({ searchKey: this.searchKey })
        .then((result) => (this.patients = result))
        .catch((error) => console.error("❌ Error searching patients:", error))
        .finally(() => (this.showLoading = false));
    } else {
      this.isDropdownOpen = false;
      this.patients = [];
    }
  }

  // 🖱️ Seleccionar paciente
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

    this.dispatchEvent(new FlowAttributeChangeEvent("patientId", id));
    this.dispatchEvent(
      new FlowAttributeChangeEvent("selectedPatientOutput", name)
    );

    this.showToastOnce({
      title: "Patient Selected:",
      message: `"${name}"`,
      variant: "success"
    });
  }

  // ❌ Limpieza completa
  clearSelection() {
    this.selectedPatientId = null;
    this.selectedPatientOutput = null;
    this.searchKey = "";
    this.patients = [];
    this.isDropdownOpen = false;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.storageKey + "_pendingSave");
    localStorage.removeItem(this.storageKey + "_lastSaveAttempt");
    console.log(`🧹 Limpieza ejecutada (${this.storageKey})`);
  }

  // ➕ Crear nuevo paciente (opcional, igual que Practice)
  handleNewPatient() {
    this.showLoading = true;
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        objectApiName: "Contact", // o 'Patient__c' si es custom
        actionName: "new"
      },
      state: {
        navigationLocation: "RELATED_LIST",
        useRecordTypeCheck: 1
      }
    });

    setTimeout(() => {
      getLastCreatedPatient()
        .then((patient) => {
          if (patient && patient.Id) {
            this.addNewPatient(patient);
          }
        })
        .catch((err) => console.error("Error al obtener nuevo Patient:", err))
        .finally(() => (this.showLoading = false));
    }, 2500);
  }

  // 🧩 Auto-rellenar tras crear nuevo paciente
  @api
  addNewPatient(newPatient) {
    if (!newPatient || !newPatient.Id) return;
    this._applyPatientSelectionState(newPatient);

    this.dispatchEvent(
      new FlowAttributeChangeEvent("patientId", newPatient.Id)
    );
    this.dispatchEvent(
      new FlowAttributeChangeEvent("selectedPatientOutput", newPatient.Name)
    );

    this.showToastOnce({
      title: "Patient Created:",
      message: `"${newPatient.Name}"`,
      variant: "success"
    });
    console.log("🆕 Patient creado y seleccionado:", newPatient.Name);
  }

  @api
  setSelectedPatient(patient) {
    if (!patient || !patient.Id) return;
    this._applyPatientSelectionState(patient);
  }

  showToastOnce({ title, message, variant }) {
    const toastKey = `${title}:${message}:${variant}`;
    const now = Date.now();

    if (this.lastToastKey === toastKey && now - this.lastToastAt < 1000) {
      return;
    }

    this.lastToastKey = toastKey;
    this.lastToastAt = now;

    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }

  _applyPatientSelectionState(patient) {
    this.selectedPatientId = patient.Id;
    this.selectedPatientOutput = patient.Name;
    this.searchKey = patient.Name;
    this.isDropdownOpen = false;
    this.showLoading = false;
    this.patients = [];

    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ id: patient.Id, name: patient.Name })
    );
  }
}