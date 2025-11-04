/*import { LightningElement, api, track } from 'lwc';
import searchPatients from '@salesforce/apex/PatientSearchController.searchPatients';
import getLastCreatedPatient from '@salesforce/apex/PatientSearchController.getLastCreatedPatient';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PatientSearchInput extends NavigationMixin(LightningElement) {
    @api selectedPatientId;
    @api selectedPatientOutput;
    @api patientId;

    @track searchKey = '';
    @track patients = [];
    @track showLoading = false;

    // 🔹 Auto-rellenar tras crear nuevo Patient
    @api
    addNewPatient(newPatient) {
        if (!newPatient || !newPatient.Id) return;

        console.log('✅ Nuevo Patient recibido:', newPatient);

        this.selectedPatientId = newPatient.Id;
        this.searchKey = newPatient.Name;
        this.patients = [];
        this.showLoading = false;

        // 🔁 Forzar render inmediato
        requestAnimationFrame(() => {
            // 1️⃣ Reactividad nativa
            this.searchKey = newPatient.Name;

            // 2️⃣ Asignación manual al input (respaldo inmediato)
            const input = this.template.querySelector('input.slds-input');
            if (input) {
                input.value = newPatient.Name;
            }

            // 3️⃣ Notificar al Flow
            this.dispatchEvent(
                new FlowAttributeChangeEvent('selectedPatientOutput', this.selectedPatientId)
            );

            // 4️⃣ Toast confirmación
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Patient Selected',
                    message: `"${newPatient.Name}" has been created and selected.`,
                    variant: 'success'
                })
            );
        });
    }

    // 🔍 Buscar pacientes
    handleSearchChange(event) {
        this.searchKey = event.target.value;

        if (this.searchKey.length >= 2) {
            searchPatients({ searchKey: this.searchKey })
                .then((result) => {
                    this.patients = result;
                })
                .catch((error) => {
                    console.error('Error searching patients:', error);
                    this.patients = [];
                });
        } else {
            this.patients = [];
        }
    }

    // 🖱️ Seleccionar paciente de la lista
   handleSelect(event) {
  const id = event.target.dataset.id;
  const name = event.target.dataset.name;

  console.log('🧩 handleSelect disparado con:', id, name);

  const selectedObj = this.patients.find((p) => p.Id === id);
  if (!selectedObj) {
    console.warn('⚠️ No se encontró el paciente con Id:', id);
    return;
  }

  this.selectedPatientId = id;
  this.searchKey = name;
  this.patients = [];

  console.log('✅ Paciente seleccionado:', selectedObj);
  console.log('🚀 Lanzando FlowAttributeChangeEvent con:', this.selectedPatientId); 
  this.dispatchEvent(
    new FlowAttributeChangeEvent('patientId', this.selectedPatientId)
  );
}


    // ➕ Crear nuevo Patient
    handleNewPatient() {
        this.showLoading = true;

        try {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    objectApiName: 'Contact',
                    actionName: 'new'
                },
                state: {
                    navigationLocation: 'RELATED_LIST',
                    useRecordTypeCheck: 1
                }
            });

            // Esperar cierre del modal, luego obtener el nuevo registro
            setTimeout(() => {
                getLastCreatedPatient()
                    .then((patient) => {
                        if (patient && patient.Id) {
                            this.addNewPatient(patient);
                        }
                        this.showLoading = false;
                    })
                    .catch((err) => {
                        this.showLoading = false;
                        console.error('Error fetching last created patient:', err);
                    });
            }, 2500);
        } catch (error) {
            this.showLoading = false;
            console.error('Error opening New Patient modal:', error);

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Unable to open the New Patient modal.',
                    variant: 'error'
                })
            );
        }
    }
}
*/
import { LightningElement, api, track } from 'lwc';
import searchPatients from '@salesforce/apex/PatientSearchController.searchPatients';
import getLastCreatedPatient from '@salesforce/apex/PatientSearchController.getLastCreatedPatient';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PatientSearchInput extends NavigationMixin(LightningElement) {
  @api selectedPatientId;
  @api selectedPatientOutput;
  @api patientId;

  @track searchKey = '';
  @track patients = [];
  @track showLoading = false;
  @track isDropdownOpen = false;

  // 🎨 Computed class para mostrar/ocultar el dropdown estilo lookup
  get comboboxClass() {
    return this.isDropdownOpen
      ? 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open'
      : 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
  }

  // 🔍 Buscar pacientes desde Apex
  handleSearchChange(event) {
    this.searchKey = event.target.value;

    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPatients({ searchKey: this.searchKey })
        .then((result) => {
          this.patients = result;
        })
        .catch((error) => {
          console.error('❌ Error searching patients:', error);
          this.patients = [];
        })
        .finally(() => {
          this.showLoading = false;
        });
    } else {
      this.isDropdownOpen = false;
      this.patients = [];
    }
  }

  // 👁️‍🗨️ Mostrar dropdown al enfocar si hay datos
  handleFocus() {
    if (this.searchKey.length >= 2 && this.patients.length > 0) {
      this.isDropdownOpen = true;
    }
  }

  // ❌ Cerrar dropdown al perder foco (con un pequeño delay para permitir clics)
  handleBlur() {
    setTimeout(() => (this.isDropdownOpen = false), 200);
  }

  // 🖱️ Seleccionar paciente de la lista
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    console.log('🧩 handleSelect disparado con:', id, name);

    const selectedObj = this.patients.find((p) => p.Id === id);
    if (!selectedObj) {
      console.warn('⚠️ No se encontró el paciente con Id:', id);
      return;
    }

    this.selectedPatientId = id;
    this.searchKey = name;
    this.patients = [];
    this.isDropdownOpen = false;

    console.log('✅ Paciente seleccionado:', selectedObj);
    console.log('🚀 Lanzando FlowAttributeChangeEvent con:', this.selectedPatientId);

    // 🔁 Actualiza la variable de salida del Flow
    this.dispatchEvent(
      new FlowAttributeChangeEvent('patientId', this.selectedPatientId)
    );

    // ✅ Muestra un toast
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Patient Selected',
        message: `"${name}" has been selected.`,
        variant: 'success'
      })
    );
  }

  // 🔹 Auto-rellenar tras crear un nuevo Patient
  @api
  addNewPatient(newPatient) {
    if (!newPatient || !newPatient.Id) return;

    console.log('✅ Nuevo Patient recibido:', newPatient);

    this.selectedPatientId = newPatient.Id;
    this.searchKey = newPatient.Name;
    this.patients = [];
    this.showLoading = false;

    // 🔁 Forzar render inmediato
    requestAnimationFrame(() => {
      // Asignación manual al input
      const input = this.template.querySelector('input.slds-input');
      if (input) {
        input.value = newPatient.Name;
      }

      // 🔊 Notificar al Flow
      this.dispatchEvent(
        new FlowAttributeChangeEvent('selectedPatientOutput', this.selectedPatientId)
      );

      // 🎉 Mostrar confirmación
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Patient Selected',
          message: `"${newPatient.Name}" has been created and selected.`,
          variant: 'success'
        })
      );
    });
  }

  // ➕ Crear nuevo Patient
  handleNewPatient() {
    this.showLoading = true;

    try {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          objectApiName: 'Contact',
          actionName: 'new'
        },
        state: {
          navigationLocation: 'RELATED_LIST',
          useRecordTypeCheck: 1
        }
      });

      // Esperar cierre del modal, luego obtener el nuevo registro
      setTimeout(() => {
        getLastCreatedPatient()
          .then((patient) => {
            if (patient && patient.Id) {
              this.addNewPatient(patient);
            }
            this.showLoading = false;
          })
          .catch((err) => {
            this.showLoading = false;
            console.error('❌ Error fetching last created patient:', err);
          });
      }, 2500);
    } catch (error) {
      this.showLoading = false;
      console.error('❌ Error opening New Patient modal:', error);

      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error',
          message: 'Unable to open the New Patient modal.',
          variant: 'error'
        })
      );
    }
  }
}