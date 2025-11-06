/*import { LightningElement, api, track } from 'lwc';
import searchPractices from '@salesforce/apex/PracticeSearchController.searchPractices';
import getPracticeRecordTypeId from '@salesforce/apex/PracticeSearchController.getPracticeRecordTypeId';
import getLastCreatedPractice from '@salesforce/apex/PracticeSearchController.getLastCreatedPractice';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PracticeSearchInput extends NavigationMixin(LightningElement) {
@api selectedPracticeId;
@api selectedPracticeOutput;
@api practiceRecordTypeId;
@api practiceId;

@track searchKey = '';
@track practices = [];
@track showLoading = false;

connectedCallback() {
getPracticeRecordTypeId()
.then((id) => (this.practiceRecordTypeId = id))
.catch((err) => console.error('Error fetching Practice RecordTypeId', err));

}

// 🔹 Auto-rellenar tras crear nuevo Practice
@api
addNewPractice(newPractice) {
if (!newPractice || !newPractice.Id) return;

console.log('✅ Nuevo Practice recibido:', newPractice);

this.selectedPracticeId = newPractice.Id;
this.searchKey = newPractice.Name;
this.practices = [];
this.showLoading = false;

// 🔁 Forzar render inmediato
requestAnimationFrame(() => {
// 1️⃣ Reactividad nativa
this.searchKey = newPractice.Name;

// 2️⃣ Asignación manual al input (respaldo inmediato)
const input = this.template.querySelector('input.slds-input');
if (input) {
input.value = newPractice.Name;
}

// 3️⃣ Notificar al Flow
this.dispatchEvent(
new FlowAttributeChangeEvent('selectedPracticeOutput', this.selectedPracticeId)
);

// 4️⃣ Toast confirmación
this.dispatchEvent(
new ShowToastEvent({
title: 'Practice Selected',
message: `"${newPractice.Name}" has been created and selected.`,
variant: 'success'
})
);
});
}

// 🔍 Buscar prácticas
handleSearchChange(event) {
this.searchKey = event.target.value;

if (this.searchKey.length >= 2) {
searchPractices({ searchKey: this.searchKey })
.then((result) => (this.practices = result))
.catch((error) => {
console.error('Error searching practices:', error);
this.practices = [];
});
} else {
this.practices = [];
}
}

 // 🖱️ Seleccionar paciente de la lista
   handleSelect(event) {
  const id = event.target.dataset.id;
  const name = event.target.dataset.name;

  console.log('🧩 handleSelect disparado con:', id, name);

  const selectedObj = this.practices.find((p) => p.Id === id);
  if (!selectedObj) {
    console.warn('⚠️ No se encontró el practice con Id:', id);
    return;
  }

  this.selectedPracticeId = id;
  this.searchKey = name;
  this.practices = [];

  console.log('✅ Practice seleccionado:', selectedObj);
  console.log('🚀 Lanzando FlowAttributeChangeEvent con:', this.selectedPracticeId); 
  this.dispatchEvent(
    new FlowAttributeChangeEvent('practiceId', this.selectedPracticeId)
  );
}


// ➕ Crear nueva práctica
handleNewPractice() {
this.showLoading = true;

try {
this[NavigationMixin.Navigate]({
type: 'standard__recordPage',
attributes: {
objectApiName: 'Account',
actionName: 'new'
},
state: {
recordTypeId: this.practiceRecordTypeId || null,
navigationLocation: 'RELATED_LIST',
useRecordTypeCheck: 1
}
});

// Esperar cierre del modal, luego obtener el nuevo registro
setTimeout(() => {
getLastCreatedPractice()
.then((practice) => {
if (practice && practice.Id) {
this.addNewPractice(practice);
}
this.showLoading = false;
})
.catch((err) => {
this.showLoading = false;
console.error('Error fetching last created practice:', err);
});
}, 2500);
} catch (error) {
this.showLoading = false;
console.error('Error opening New Practice modal:', error);

this.dispatchEvent(
new ShowToastEvent({
title: 'Error',
message: 'Unable to open the New Practice modal.',
variant: 'error'
})
);
}
}
} */


/*
import { LightningElement, api, track } from 'lwc';
import searchPractices from '@salesforce/apex/PracticeSearchController.searchPractices';
import getPracticeRecordTypeId from '@salesforce/apex/PracticeSearchController.getPracticeRecordTypeId';
import getLastCreatedPractice from '@salesforce/apex/PracticeSearchController.getLastCreatedPractice';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PracticeSearchInput extends NavigationMixin(LightningElement) {
  // ⚙️ Props usadas en Flow
  @api selectedPracticeId;
  @api selectedPracticeOutput;
  @api practiceRecordTypeId;
  @api practiceId;

  // 🧠 Estado interno del componente
  @track searchKey = '';
  @track practices = [];
  @track showLoading = false;
  @track isDropdownOpen = false;

  connectedCallback() {
    getPracticeRecordTypeId()
      .then((id) => (this.practiceRecordTypeId = id))
      .catch((err) => console.error('Error fetching Practice RecordTypeId', err));
  }

  // ✅ Computed class para el dropdown SLDS
  get comboboxClass() {
    return this.isDropdownOpen
      ? 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open'
      : 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
  }

  // 🔍 Buscar prácticas con Apex
  handleSearchChange(event) {
    this.searchKey = event.target.value;

    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPractices({ searchKey: this.searchKey })
        .then((result) => {
          this.practices = result;
        })
        .catch((error) => {
          console.error('Error searching practices:', error);
          this.practices = [];
        })
        .finally(() => {
          this.showLoading = false;
        });
    } else {
      this.isDropdownOpen = false;
      this.practices = [];
    }
  }

  // 🔽 Mostrar dropdown si hay texto y resultados
  handleFocus() {
    if (this.searchKey.length >= 2 && this.practices.length > 0) {
      this.isDropdownOpen = true;
    }
  }

  // ❌ Cerrar dropdown al perder foco (con retraso para permitir clic)
  handleBlur() {
    setTimeout(() => (this.isDropdownOpen = false), 200);
  }

  // 🖱️ Seleccionar práctica de la lista
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    console.log('🧩 handleSelect disparado con:', id, name);

    const selectedObj = this.practices.find((p) => p.Id === id);
    if (!selectedObj) {
      console.warn('⚠️ No se encontró el practice con Id:', id);
      return;
    }

    this.selectedPracticeId = id;
    this.searchKey = name;
    this.practices = [];
    this.isDropdownOpen = false;

    console.log('✅ Practice seleccionado:', selectedObj);

    // 🚀 Notificar al Flow padre
    this.dispatchEvent(
      new FlowAttributeChangeEvent('practiceId', this.selectedPracticeId)
    );

    // ✅ Toast visual opcional
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${name}" has been selected.`,
        variant: 'success'
      })
    );
  }

  @api
addNewPractice(newPractice) {
  if (!newPractice || !newPractice.Id) return;

  console.log('✅ Nuevo Practice recibido:', newPractice);

  this.selectedPracticeId = newPractice.Id;
  this.searchKey = newPractice.Name;
  this.practices = [];
  this.showLoading = false;

  requestAnimationFrame(() => {
    const input = this.template.querySelector('input.slds-input');
    if (input) input.value = newPractice.Name;

    // 🔄 Notificar a todos los posibles Flows (por si usan distinto atributo)
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', this.selectedPracticeId));
    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', this.selectedPracticeId));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeId', this.selectedPracticeId));

    // 🌐 Emitir evento global para PracticeInCaseFlow
    window.dispatchEvent(new CustomEvent('practicecreated', {
      detail: {
        practiceId: newPractice.Id,
        practiceRecord: newPractice
      }
    }));

    console.log('🌐 Evento global practicecreated despachado:', newPractice.Name);

    // ✅ Toast visual
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${newPractice.Name}" has been created and selected.`,
        variant: 'success'
      })
    );
  });
}

  // 🔹 Auto-rellenar tras crear nuevo Practice
 /* @api
  addNewPractice(newPractice) {
    if (!newPractice || !newPractice.Id) return;

    console.log('✅ Nuevo Practice recibido:', newPractice);

    this.selectedPracticeId = newPractice.Id;
    this.searchKey = newPractice.Name;
    this.practices = [];
    this.showLoading = false;

    requestAnimationFrame(() => {
      const input = this.template.querySelector('input.slds-input');
      if (input) input.value = newPractice.Name;

      this.dispatchEvent(
        new FlowAttributeChangeEvent('selectedPracticeOutput', this.selectedPracticeId)
      );

      // 🌐 Emitir evento global para sincronizar con PracticeInCaseFlow
window.dispatchEvent(
  new CustomEvent('practicecreated', {
    detail: {
      practiceId: newPractice.Id,
      practiceRecord: newPractice
    }
  })
);

console.log('🌐 Evento global practicecreated despachado:', newPractice.Name);


      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Practice Selected',
          message: `"${newPractice.Name}" has been created and selected.`,
          variant: 'success'
        })
      );
    });
  }

  // ➕ Crear nueva práctica (abre modal estándar)
  handleNewPractice() {
    this.showLoading = true;

    try {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          objectApiName: 'Account',
          actionName: 'new'
        },
        state: {
          recordTypeId: this.practiceRecordTypeId || null,
          navigationLocation: 'RELATED_LIST',
          useRecordTypeCheck: 1
        }
      });

      // Esperar cierre del modal, luego obtener el nuevo registro
      setTimeout(() => {
        getLastCreatedPractice()
          .then((practice) => {
            if (practice && practice.Id) {
              this.addNewPractice(practice);
            }
            this.showLoading = false;
          })
          .catch((err) => {
            this.showLoading = false;
            console.error('Error fetching last created practice:', err);
          });
      }, 2500);
    } catch (error) {
      this.showLoading = false;
      console.error('Error opening New Practice modal:', error);

      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error',
          message: 'Unable to open the New Practice modal.',
          variant: 'error'
        })
      );
    }
  }
} */

  /*
import { LightningElement, api, track } from 'lwc';
import searchPractices from '@salesforce/apex/PracticeSearchController.searchPractices';
import getPracticeRecordTypeId from '@salesforce/apex/PracticeSearchController.getPracticeRecordTypeId';
import getLastCreatedPractice from '@salesforce/apex/PracticeSearchController.getLastCreatedPractice';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PracticeSearchInput extends NavigationMixin(LightningElement) {
  // ⚙️ Props usadas en Flow
  @api selectedPracticeId;
  @api selectedPracticeOutput;
  @api practiceRecordTypeId;
  @api practiceId;

  // 🧠 Estado interno
  @track searchKey = '';
  @track practices = [];
  @track showLoading = false;
  @track isDropdownOpen = false;
  @track isInputFilled = false;

  // 🧩 Inicialización del componente
  connectedCallback() {
    // Obtener RecordTypeId
    getPracticeRecordTypeId()
      .then((id) => (this.practiceRecordTypeId = id))
      .catch((err) => console.error('Error fetching Practice RecordTypeId', err));

    // Restaurar selección previa desde sessionStorage
    const saved = sessionStorage.getItem('selectedPractice');
    if (saved) {
      const practice = JSON.parse(saved);
      this.selectedPracticeId = practice.Id;
      this.searchKey = practice.Name;
      this.isInputFilled = true;
      console.log('🔁 Restaurado Practice desde sesión:', practice.Name);
    }

    // Escuchar evento global de Case guardado
    window.addEventListener('casesaved', this.handleCaseSaved.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener('casesaved', this.handleCaseSaved.bind(this));
  }

  // 🧹 Se limpia solo cuando el Case se guarda correctamente
  handleCaseSaved() {
    console.log('💾 Case guardado correctamente, limpiando selección');
    sessionStorage.removeItem('selectedPractice');
    this.clearSelection();
  }

  // ✅ Computed class para SLDS
  get comboboxClass() {
    return this.isDropdownOpen
      ? 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open'
      : 'slds-combobox_container slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
  }

  // 🔍 Buscar prácticas
  handleSearchChange(event) {
    this.searchKey = event.target.value;
    this.isInputFilled = this.searchKey.length > 0;

    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;

      searchPractices({ searchKey: this.searchKey })
        .then((result) => {
          this.practices = result;
        })
        .catch((error) => {
          console.error('Error searching practices:', error);
          this.practices = [];
        })
        .finally(() => {
          this.showLoading = false;
        });
    } else {
      this.isDropdownOpen = false;
      this.practices = [];
    }
  }

  handleFocus() {
    if (this.searchKey.length >= 2 && this.practices.length > 0) {
      this.isDropdownOpen = true;
    }
  }

  handleBlur() {
    setTimeout(() => (this.isDropdownOpen = false), 200);
  }

  // 🖱️ Seleccionar práctica
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    const selectedObj = this.practices.find((p) => p.Id === id);
    if (!selectedObj) return;

    this.selectedPracticeId = id;
    this.searchKey = name;
    this.practices = [];
    this.isDropdownOpen = false;
    this.isInputFilled = true;

    // 💾 Guardar selección temporalmente
    sessionStorage.setItem('selectedPractice', JSON.stringify(selectedObj));

    // Notificar al Flow
    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', id));

    // Toast visual
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${name}" has been selected.`,
        variant: 'success'
      })
    );

    console.log('✅ Practice seleccionado y guardado en sesión:', name);
  }

  // ❌ Limpiar selección manualmente
  clearSelection() {
    this.selectedPracticeId = null;
    this.searchKey = '';
    this.practices = [];
    this.isDropdownOpen = false;
    this.isInputFilled = false;

    sessionStorage.removeItem('selectedPractice');

    // Notificar al Flow
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', null));
    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', null));

    // Limpiar input
    const input = this.template.querySelector('input.slds-input');
    if (input) input.value = '';

    this.dispatchEvent(
      new CustomEvent('clearselection', { bubbles: true, composed: true })
    );

    console.log('🧹 Selección de practice limpiada');
  }

  // 🧩 Auto-rellenar tras crear nuevo Practice
  @api
  addNewPractice(newPractice) {
    if (!newPractice || !newPractice.Id) return;

    this.selectedPracticeId = newPractice.Id;
    this.searchKey = newPractice.Name;
    this.practices = [];
    this.showLoading = false;
    this.isInputFilled = true;

    // 💾 Guardar en sesión
    sessionStorage.setItem('selectedPractice', JSON.stringify(newPractice));

    requestAnimationFrame(() => {
      const input = this.template.querySelector('input.slds-input');
      if (input) input.value = newPractice.Name;

      this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', this.selectedPracticeId));
      this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', this.selectedPracticeId));

      // 🌐 Emitir evento global
      window.dispatchEvent(new CustomEvent('practicecreated', {
        detail: {
          practiceId: newPractice.Id,
          practiceRecord: newPractice
        }
      }));

      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Practice Selected',
          message: `"${newPractice.Name}" has been created and selected.`,
          variant: 'success'
        })
      );
    });
  }

  // ➕ Crear nueva práctica (abre modal estándar)
  handleNewPractice() {
    this.showLoading = true;

    try {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          objectApiName: 'Account',
          actionName: 'new'
        },
        state: {
          recordTypeId: this.practiceRecordTypeId || null,
          navigationLocation: 'RELATED_LIST',
          useRecordTypeCheck: 1
        }
      });

      // Esperar cierre del modal, luego obtener el nuevo registro
      setTimeout(() => {
        getLastCreatedPractice()
          .then((practice) => {
            if (practice && practice.Id) {
              this.addNewPractice(practice);
            }
            this.showLoading = false;
          })
          .catch((err) => {
            this.showLoading = false;
            console.error('Error fetching last created practice:', err);
          });
      }, 2500);
    } catch (error) {
      this.showLoading = false;
      console.error('Error opening New Practice modal:', error);

      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error',
          message: 'Unable to open the New Practice modal.',
          variant: 'error'
        })
      );
    }
  }
}  */

  import { LightningElement, api, track } from 'lwc';
import searchPractices from '@salesforce/apex/PracticeSearchController.searchPractices';
import getPracticeRecordTypeId from '@salesforce/apex/PracticeSearchController.getPracticeRecordTypeId';
import getLastCreatedPractice from '@salesforce/apex/PracticeSearchController.getLastCreatedPractice';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const STORAGE_KEY = 'currentCasePractice';

export default class PracticeSearchInput extends NavigationMixin(LightningElement) {
  // ⚙️ Flow props
  @api selectedPracticeId;
  @api selectedPracticeOutput;
  @api practiceRecordTypeId;
  @api practiceId;

  // 🧠 Estado interno
  @track searchKey = '';
  @track practices = [];
  @track showLoading = false;
  @track isDropdownOpen = false;

  // 👁️ Computed: muestra la ❌ cuando hay texto o selección
  get isInputFilled() {
    return this.searchKey && this.searchKey.trim() !== '';
  }

  // 🧩 Inicialización
  connectedCallback() {
    console.log('🏢 practiceSearchInput conectado');
    this.initRecordType();
    this.restorePreviousSelection();

    // Escuchar evento de Flow completado
    window.addEventListener('flowfinished', this.handleFlowFinished.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener('flowfinished', this.handleFlowFinished.bind(this));
  }

  // 📦 RecordTypeId
  async initRecordType() {
    try {
      this.practiceRecordTypeId = await getPracticeRecordTypeId();
    } catch (err) {
      console.error('Error fetching Practice RecordTypeId', err);
    }
  }

  // ♻️ Restaurar si hubo error de validación
  restorePreviousSelection() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      this.selectedPracticeId = parsed.id;
      this.searchKey = parsed.name;
      console.log('♻️ Restaurado Practice tras error:', parsed.name);
    }
  }

  // 💾 Flow guardado → limpiar todo
  handleFlowFinished() {
    console.log('💾 Flow finalizado → limpiando Practice');
    sessionStorage.removeItem(STORAGE_KEY);
    this.clearSelection();
  }

  // 🔍 Buscar Practices
  handleSearchChange(event) {
    this.searchKey = event.target.value;

    if (this.searchKey.length >= 2) {
      this.isDropdownOpen = true;
      this.showLoading = true;
      searchPractices({ searchKey: this.searchKey })
        .then((result) => (this.practices = result))
        .catch((error) => {
          console.error('❌ Error buscando practices:', error);
          this.practices = [];
        })
        .finally(() => (this.showLoading = false));
    } else {
      this.isDropdownOpen = false;
      this.practices = [];
    }
  }

  // 🖱️ Seleccionar Practice
  handleSelect(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;

    this.selectedPracticeId = id;
    this.searchKey = name;
    this.isDropdownOpen = false;
    this.practices = [];

    // 💾 Guardar selección por si el Case no se guarda
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));

    // Notificar al Flow
    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', id));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', name));

    // Toast visual
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${name}" seleccionado.`,
        variant: 'success'
      })
    );

    console.log('✅ Practice seleccionado:', name);
  }

  // ❌ Limpiar manualmente
  clearSelection() {
    this.selectedPracticeId = null;
    this.selectedPracticeOutput = null;
    this.searchKey = '';
    this.practices = [];
    this.isDropdownOpen = false;
    sessionStorage.removeItem(STORAGE_KEY);

    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', null));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', null));

    console.log('🧹 Campo Practice limpiado');
  }

  // ➕ Crear nueva práctica (abre modal estándar)
  handleNewPractice() {
    this.showLoading = true;
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        objectApiName: 'Account',
        actionName: 'new'
      },
      state: {
        recordTypeId: this.practiceRecordTypeId || null,
        navigationLocation: 'RELATED_LIST',
        useRecordTypeCheck: 1
      }
    });

    // Esperar y recuperar la última práctica creada
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

  // 🧩 Auto-rellenar tras crear nueva práctica
  @api
  addNewPractice(newPractice) {
    if (!newPractice || !newPractice.Id) return;
    this.selectedPracticeId = newPractice.Id;
    this.searchKey = newPractice.Name;
    this.isDropdownOpen = false;
    this.showLoading = false;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: newPractice.Id, name: newPractice.Name }));

    this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', newPractice.Id));
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedPracticeOutput', newPractice.Name));

    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Practice Selected',
        message: `"${newPractice.Name}" creada y seleccionada.`,
        variant: 'success'
      })
    );

    console.log('🆕 Practice creada y seleccionada:', newPractice.Name);
  }
}