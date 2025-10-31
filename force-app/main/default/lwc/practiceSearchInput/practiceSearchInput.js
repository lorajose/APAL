import { LightningElement, api, track } from 'lwc';
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
}