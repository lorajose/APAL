import { LightningElement, track, api } from 'lwc';

export default class GpCaseStepBasics extends LightningElement {
    
    // Propiedad para recibir errores del componente padre (validation framework)
    @api errors = {};
    
    @track subject = '';
    @track priority = '';
    @track description = '';

    @api
    set data(value) {
        if (!value) return;

        this.subject = value.Subject || '';
        this.priority = value.Priority || '';
        this.description = value.Description || '';
   }

   get data() {
      return {
         Subject: this.subject,
         Priority: this.priority,
         Description: this.description
      };
    }

    priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' },
    ];
    
    // Getters para aplicar clases de error si el padre detecta un error
    get subjectErrorClass() {
        return this.errors.Subject ? 'slds-has-error' : '';
    }
    get priorityErrorClass() {
        return this.errors.Priority ? 'slds-has-error' : '';
    }
    get descriptionErrorClass() {
        return this.errors.Description ? 'slds-has-error' : '';
    }

    handleInputChange(event) {
    const field = event.target.dataset.field;
    const value = event.detail.value;

    console.warn("🔥 CHILD SEND:", {
     Subject: this.subject,
     Priority: this.priority,
     Description: this.description
   });


    if (field === 'Subject') {
        this.subject = value;
    } else if (field === 'Priority') {
        this.priority = value;
    } else if (field === 'Description') {
        this.description = value;
    }

    // 🔥 Notifica al padre que cambió algo en Step 1
    this.dispatchEvent(new CustomEvent('dataupdated', {
        detail: {
            Subject: this.subject,
            Priority: this.priority,
            Description: this.description
        }
    }));
}


    // Método expuesto para que el componente padre pueda poner el foco en el primer error
    @api
    focusFirstError(path) {
        const fieldMap = {
            'Subject': 'lightning-input[data-field="Subject"]',
            'Priority': 'lightning-combobox[data-field="Priority"]',
            'Description': 'lightning-textarea[data-field="Description"]'
        };

        const selector = fieldMap[path];
        if (selector) {
            this.template.querySelector(selector)?.focus();
        }
    }
    
    handleBack() {
        // En un wizard real, esto dispararía un evento 'previous'
    }

    handleNext() {
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (allValid) {
            // Dispara el evento 'next' con los datos
            const stepData = {
                Subject: this.subject,
                Priority: this.priority,
                Description: this.description,
            };
            this.dispatchEvent(new CustomEvent('next', { detail: stepData }));
        } else {
            // Opcional: enfocar el primer campo inválido si la validación LWC falla
        }
    }
}