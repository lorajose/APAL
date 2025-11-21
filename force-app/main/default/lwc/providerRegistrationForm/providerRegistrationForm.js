/*import { LightningElement, track } from 'lwc';

export default class ProviderRegistrationForm extends LightningElement {
    @track currentStep = 0;
    initialized = false;

    //siteKey = '6LerTNcqAAAAAI5br6iw0fBj7PeJjSbw_LkEOa6F';
    siteKey = '6LeRoAwsAAAAAOEq4hFKShukgv3ivlVnLlXZ7I7N';

    // --------- PEQUEÑO HELPER PARA IDS CON SUFIJO (-21, -33, ETC) ----------
    getByIdPrefix(prefix) {
        // Busca el PRIMER elemento cuyo id comience con el prefijo
        return this.template.querySelector(`[id^="${prefix}"]`);
    }

    getAllBySelector(selector) {
        return this.template.querySelectorAll(selector) || [];
    }

    // ----------------- RENDERED CALLBACK -----------------
    renderedCallback() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        // Lead source desde la URL
        this.setupLeadSource();

        // Mostrar step inicial
        this.showStep();

        // reCAPTCHA
        this.loadRecaptchaScript();

        // Ajustar toggles según valores por defecto
        this.handleToggleFields();
    }

    // ---------- STEP CLASSES ----------
    get step1Class() { return 'form-step' + (this.currentStep === 0 ? ' active' : ''); }
    get step2Class() { return 'form-step' + (this.currentStep === 1 ? ' active' : ''); }
    get step3Class() { return 'form-step' + (this.currentStep === 2 ? ' active' : ''); }
    get step4Class() { return 'form-step' + (this.currentStep === 3 ? ' active' : ''); }
    get step5Class() { return 'form-step' + (this.currentStep === 4 ? ' active' : ''); }

    get step1ProgressClass() { return this.currentStep >= 0 ? 'active' : ''; }
    get step2ProgressClass() { return this.currentStep >= 1 ? 'active' : ''; }
    get step3ProgressClass() { return this.currentStep >= 2 ? 'active' : ''; }
    get step4ProgressClass() { return this.currentStep >= 3 ? 'active' : ''; }
    get step5ProgressClass() { return this.currentStep >= 4 ? 'active' : ''; }

    // ----------------- NAVEGACIÓN -----------------
    handleNext(event) {
        event.preventDefault();
        if (this.validateStepWithErrorMessages(this.currentStep)) {
            this.currentStep = Math.min(this.currentStep + 1, 4);
            this.hideErrorMessage();
            this.showStep();
        }
    }

    handlePrev(event) {
        event.preventDefault();
        if (this.currentStep > 0) {
            this.currentStep--;
            this.hideErrorMessage();
            this.showStep();
        }
    }

    showStep() {
        // Scroll al contenedor
        const container = this.template.querySelector('.form-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth' });
        }

        // Recalcular visibles/ocultos en cada cambio de paso
        this.handleToggleFields();
    }

    // ----------------- SUBMIT -----------------
    handleSubmit(event) {
        event.preventDefault();

        if (!this.validateStepWithErrorMessages(this.currentStep)) {
            return;
        }

        // Fecha de fin de entrenamiento
        const dateInput = this.getByIdPrefix('trainenddate');
        const hiddenDate = this.getByIdPrefix('trainenddate_hidden');

        if (dateInput && hiddenDate) {
            const raw = dateInput.value;
            if (raw) {
                const [year, month, day] = raw.split('-');
                hiddenDate.value = `${month}/${day}/${year}`;
            } else {
                hiddenDate.value = '';
            }
        }

        // reCAPTCHA token
        let token = null;
        try {
            if (window.grecaptcha) {
                token = window.grecaptcha.getResponse();
            }
        } catch (e) {
            // ignore
        }

        if (!token || token.trim() === '') {
            // Mensaje simple para el usuario
            // (si quieres puedes cambiarlo por el error box arriba)
            alert('Please complete the reCAPTCHA before submitting the form.');
            return;
        }

        const recaptchaHidden = this.getByIdPrefix('recaptchaResponse');
        if (recaptchaHidden) {
            recaptchaHidden.value = token;
        }

        this.updateIncompleteSubmission();

        const form = this.getByIdPrefix('multi-step-form');
        if (form) {
            form.submit();
        } else {
            // fallback por si acaso
            console.error('❌ No se encontró el formulario multi-step para enviar.');
        }
    }

    closeModal() {
        const modal = this.getByIdPrefix('thank-you-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ----------------- LEAD SOURCE -----------------
    setupLeadSource() {
        try {
            const DEFAULT = 'Web';
            const paramNames = ['leadsource', 'leadSource', 'LeadSource'];
            const qs = new URLSearchParams(window.location.search);

            let raw = null;
            for (const k of paramNames) {
                const v = qs.get(k);
                if (v !== null && v !== '') {
                    raw = v;
                    break;
                }
            }

            let clean = DEFAULT;
            if (raw != null) {
                try { raw = decodeURIComponent(raw); } catch (e) {}
                clean = String(raw)
                    .replace(/[\u0000-\u001F\u007F]/g, '')
                    .replace(/[<>]/g, '')
                    .trim()
                    .slice(0, 100);

                if (clean.length === 0) clean = DEFAULT;
            }

            const field = this.getByIdPrefix('lead_source');
            if (field) {
                field.value = clean;
            }
        } catch (e) {
            // silencioso
        }
    }

    // ----------------- ENTRADA DE CAMPOS -----------------
    handleFieldInput(event) {
        const el = event.target;

        // Si no es requerido o está oculto, ignorar
        if (!el.required || el.classList.contains('hidden')) {
            return;
        }

        if (el.checkValidity()) {
            this.unhighlightField(el);
        } else {
            this.highlightField(el);
        }

        // Siempre recalculamos toggles por si cambió algún select
        this.handleToggleFields();
    }

    handlePhoneInput(event) {
        const el = event.target;
        el.value = this.formatPhoneNumber(el.value);
        this.handleFieldInput(event);
    }

    handlePhoneExtInput(event) {
        const el = event.target;
        el.value = el.value.replace(/[^0-9]/g, '').slice(0, 5);
        this.handleFieldInput(event);
    }

    // ----------------- VALIDACIÓN POR STEP -----------------
    validateStepWithErrorMessages(stepIndex) {
        // Actualizamos visibilidad/requeridos antes de validar
        this.handleToggleFields();

        const steps = this.template.querySelectorAll('.form-step');
        if (!steps || !steps[stepIndex]) {
            return true;
        }

        const step = steps[stepIndex];
        const requiredFields = step.querySelectorAll('[required]:not(.hidden)');

        let isValid = true;
        const messages = [];

        requiredFields.forEach((el) => {
            const labelText = this.getFieldLabel(el);

            if (el.tagName === 'SELECT') {
                if (!el.value || el.value === '--None--' || el.value === '--Select--') {
                    isValid = false;
                    messages.push(`Please select an option for "${labelText}"`);
                    this.highlightField(el);
                }
            } else if (el.type === 'checkbox') {
                if (!el.checked) {
                    isValid = false;
                    messages.push(`Please check "${labelText}"`);
                    this.highlightField(el);
                }
            } else {
                if (!el.value.trim() || !el.checkValidity()) {
                    isValid = false;
                    messages.push(`Please fill in "${labelText}"`);
                    this.highlightField(el);
                }
            }
        });

        if (!isValid) {
            this.showErrorMessage(messages);
        } else {
            this.hideErrorMessage();
        }

        this.updateIncompleteSubmission();
        return isValid;
    }

    getFieldLabel(el) {
        const id = el.id;
        if (!id) {
            return el.name || 'This field';
        }
        const label = this.template.querySelector(`label[for="${id}"]`);
        return label ? label.textContent.replace('*', '').trim() : (el.name || id);
    }

    highlightField(el) {
        el.style.border = '2px solid red';
        el.style.backgroundColor = '#fff0f0';
    }

    unhighlightField(el) {
        el.style.border = '1px solid #ccc';
        el.style.backgroundColor = '';
    }

    showErrorMessage(messages) {
        const box = this.getByIdPrefix('form-error-message');
        if (!box) return;

        let html = '<strong>Please fix the following errors:</strong><ul>';
        messages.forEach((m) => { html += `<li>${m}</li>`; });
        html += '</ul>';

        box.innerHTML = html;
        box.style.display = 'block';
        box.classList.remove('hidden');
    }

    hideErrorMessage() {
        const box = this.getByIdPrefix('form-error-message');
        if (!box) return;
        box.style.display = 'none';
        box.innerHTML = '';
        box.classList.add('hidden');
    }
    

    // ----------------- TOGGLES (USANDO id^="...") -----------------
    handleToggleFields() {
        const get = (prefix) => this.getByIdPrefix(prefix);

        // Trainee
        const traineeSelect = get('The_provider_is_a_Trainee__c');
        const traineeType = get('Trainee_Type__c');
        const traineeLabel = get('Trainee_Type_Label');

        const otherTraineeInput = get('Other_Medical_Trainee_Description__c');
        const otherTraineeLabel = get('otherMedicalTraineeDescriptionid');

        const endDateInput = get('trainenddate');
        const endDateLabel = get('trainenddate_label');

        // ---- Trainee YES/NO ----
        if (traineeSelect && traineeSelect.value === 'Yes') {
            if (traineeLabel) traineeLabel.classList.remove('hidden');
            if (traineeType) {
                traineeType.classList.remove('hidden');
                traineeType.required = true;
            }
        } else {
            if (traineeLabel) traineeLabel.classList.add('hidden');
            if (traineeType) {
                traineeType.classList.add('hidden');
                traineeType.required = false;
                traineeType.value = '';
            }
            if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
            if (otherTraineeInput) {
                otherTraineeInput.classList.add('hidden');
                otherTraineeInput.required = false;
                otherTraineeInput.value = '';
            }
            if (endDateLabel) endDateLabel.classList.add('hidden');
            if (endDateInput) {
                endDateInput.classList.add('hidden');
                endDateInput.required = false;
                endDateInput.value = '';
            }
        }

        // ---- Dentro de Trainee YES ----
        if (traineeSelect && traineeSelect.value === 'Yes' && traineeType && traineeType.value) {
            if (traineeType.value === 'Other medical trainee') {
                if (otherTraineeLabel) otherTraineeLabel.classList.remove('hidden');
                if (otherTraineeInput) {
                    otherTraineeInput.classList.remove('hidden');
                    otherTraineeInput.required = true;
                }
                if (endDateLabel) endDateLabel.classList.add('hidden');
                if (endDateInput) endDateInput.required = false;

            } else if (traineeType.value.includes('Student')) {
                if (endDateLabel) endDateLabel.classList.remove('hidden');
                if (endDateInput) {
                    endDateInput.classList.remove('hidden');
                    endDateInput.required = true;
                }
                if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
                if (otherTraineeInput) otherTraineeInput.required = false;

            } else {
                if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
                if (otherTraineeInput) {
                    otherTraineeInput.classList.add('hidden');
                    otherTraineeInput.required = false;
                }
                if (endDateLabel) endDateLabel.classList.add('hidden');
                if (endDateInput) {
                    endDateInput.classList.add('hidden');
                    endDateInput.required = false;
                }
            }
        }

        // ---- Mental Health Training ----
        const mhSelect = get('Specialty_Mental_Health_Training__c');
        const mhLabel = get('mhTrainingDescLabel');
        const mhInput = get('Specialty_Mental_Health_Training_Desc__c');

        if (mhSelect && mhSelect.value === 'Yes') {
            if (mhLabel) mhLabel.classList.remove('hidden');
            if (mhInput) {
                mhInput.classList.remove('hidden');
                mhInput.required = true;
            }
        } else {
            if (mhLabel) mhLabel.classList.add('hidden');
            if (mhInput) {
                mhInput.classList.add('hidden');
                mhInput.required = false;
                mhInput.value = '';
            }
        }

        // ---- Provider Type Other ----
        const typeSelect = get('type');
        const otherProviderLabel = get('Other-Provider-id');
        const otherProviderInput = get('pcpothersta_desc__c');

        if (typeSelect && typeSelect.value === 'Other') {
            if (otherProviderLabel) otherProviderLabel.classList.remove('hidden');
            if (otherProviderInput) {
                otherProviderInput.classList.remove('hidden');
                otherProviderInput.required = true;
            }
        } else {
            if (otherProviderLabel) otherProviderLabel.classList.add('hidden');
            if (otherProviderInput) {
                otherProviderInput.classList.add('hidden');
                otherProviderInput.required = false;
                otherProviderInput.value = '';
            }
        }

        // ---- Specialty Other ----
        const specialtySelect = get('specialty-desc');
        const otherSpecLabel = get('Other-specialty-id');
        const otherSpecInput = get('other-specialty-desc');

        if (specialtySelect && specialtySelect.value === 'Other') {
            if (otherSpecLabel) otherSpecLabel.classList.remove('hidden');
            if (otherSpecInput) {
                otherSpecInput.classList.remove('hidden');
                otherSpecInput.required = true;
            }
        } else {
            if (otherSpecLabel) otherSpecLabel.classList.add('hidden');
            if (otherSpecInput) {
                otherSpecInput.classList.add('hidden');
                otherSpecInput.required = false;
                otherSpecInput.value = '';
            }
        }

        // ---- Hear Other ----
        const otherCheck = get('otherCheck');
        const heardLabel = get('heard_other_label');
        const heardInput = get('heard_other');

        if (otherCheck && otherCheck.checked) {
            if (heardLabel) heardLabel.classList.remove('hidden');
            if (heardInput) {
                heardInput.classList.remove('hidden');
                heardInput.required = true;
            }
        } else {
            if (heardLabel) heardLabel.classList.add('hidden');
            if (heardInput) {
                heardInput.classList.add('hidden');
                heardInput.required = false;
                heardInput.value = '';
            }
        }

        // ---- Race Other ----
        const raceSelect = get('How_do_You_Identify_with_Respect_to_Race__c');
        const raceLabel = get('pcpracedesc-id');
        const raceInput = get('pcpracedesc');

        if (raceSelect && raceSelect.value === 'Prefer to self-describe (option not listed)') {
            if (raceLabel) raceLabel.classList.remove('hidden');
            if (raceInput) {
                raceInput.classList.remove('hidden');
                raceInput.required = true;
            }
        } else {
            if (raceLabel) raceLabel.classList.add('hidden');
            if (raceInput) {
                raceInput.classList.add('hidden');
                raceInput.required = false;
                raceInput.value = '';
            }
        }

        // ---- Language Other ----
        const langSelect = get('Provider_Language_other_than_English__c');
        const langLabel = get('Provider-Description-id');
        const langInput = get('Provider_Languages_Description__c');

        if (langSelect && langSelect.value === 'Other') {
            if (langLabel) langLabel.classList.remove('hidden');
            if (langInput) {
                langInput.classList.remove('hidden');
                langInput.required = true;
            }
        } else {
            if (langLabel) langLabel.classList.add('hidden');
            if (langInput) {
                langInput.classList.add('hidden');
                langInput.required = false;
                langInput.value = '';
            }
        }
    }

    // ---------- INCOMPLETE (placeholder) ----------
    updateIncompleteSubmission() {
        // Aquí puedes poner lógica extra si luego MSV quiere marcar "Incomplete Submission"
    }

    // ---------- FORMATO TELÉFONO ----------
    formatPhoneNumber(value) {
        let digits = value.replace(/\D/g, '').slice(0, 10);

        if (digits.length < 4) return digits;
        if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // ---------- RECAPTCHA ----------
  /*  loadRecaptchaScript() {
        if (window.grecaptcha) {
            this.setupRecaptchaCallback();
            return;
        }

        this.setupRecaptchaCallback();

        if (!window._providerRecaptchaScriptLoaded) {
            window._providerRecaptchaScriptLoaded = true;
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }

    setupRecaptchaCallback() {
        window.providerRecaptchaCallbackLwc = (token) => {
            const btn = this.getByIdPrefix('submit-complete');
            if (btn) {
                btn.disabled = false;
            }

            const recaptchaHidden = this.getByIdPrefix('recaptchaResponse');
            if (recaptchaHidden) {
                recaptchaHidden.value = token;
            }
        };
    } *

    // ---------- RECAPTCHA ----------
loadRecaptchaScript() {
    try {
        // Si ya está cargado, solo inicializa callback
        if (window.grecaptcha) {
            this.setupRecaptchaCallback();
            return;
        }

        // Registrar callback ANTES de cargar script
        this.setupRecaptchaCallback();

        // Evitar doble carga
        if (!window._providerRecaptchaScriptLoaded) {
            window._providerRecaptchaScriptLoaded = true;

            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                // reCAPTCHA cargó
                if (window.grecaptcha) {
                    console.log("reCAPTCHA loaded");
                }
            };

            script.onerror = (e) => {
                console.error("Error loading reCAPTCHA script", e);
            };

            document.head.appendChild(script);
        }
    } catch (e) {
        console.error("reCAPTCHA initialization error:", e);
    }
}

setupRecaptchaCallback() {
    try {
        window.providerRecaptchaCallbackLwc = (token) => {
            console.log("reCAPTCHA token received:", token);

            const btn = this.getByIdPrefix('submit-complete');
            if (btn) btn.disabled = false;

            const recaptchaHidden = this.getByIdPrefix('recaptchaResponse');
            if (recaptchaHidden) {
                recaptchaHidden.value = token;
            }
        };
    } catch (e) {
        console.error("setupRecaptchaCallback error:", e);
    }
}


} */

import { LightningElement, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import PROVIDER_FORM from '@salesforce/resourceUrl/provider_form';

// URL DE GOOGLE (sin el script):
const RECAPTCHA_URL = 'https://www.google.com/recaptcha/enterprise.js?render=';

export default class ProviderRegistrationForm extends LightningElement {
    @track currentStep = 0;
    initialized = false;
   // recaptchaLoaded = false;

   // 🔥 1. Tu Site Key de reCAPTCHA Enterprise (REEMPLAZAR)
    siteKey = "6Ldt6hIsAAAAAMhPeE2g8U64OuSagD5smpFTZJDi";

    // ==== Tu siteKey de reCAPTCHA Enterprise (REEMPLAZAR) =====
   // siteKey = "6LeRoAwsAAAAAOEq4hFKShukgv3ivlVnLlXZ7I7N";

    // ======================================================
    //  SMALL HELPERS
    // ======================================================
    getByIdPrefix(prefix) {
        return this.template.querySelector(`[id^="${prefix}"]`);
    }

    getAllBySelector(selector) {
        return this.template.querySelectorAll(selector) || [];
    }


    // ======================================================
    //  RENDER INIT
    // ======================================================
    renderedCallback() {
        if (this.initialized) return;
        this.initialized = true;
       // this.loadRecaptchaScript();

        this.setupLeadSource();
        this.showStep();
        this.handleToggleFields();

        // 🔥 Cargar reCAPTCHA Enterprise Embedded
               //this.loadRecaptchaEnterprise();
    }

   loadRecaptchaScript() {
        
        // 1. Define la URL completa del script de Google
        const googleScriptUrl = 'https://www.google.com/recaptcha/enterprise.js?render=' + this.siteKey;

        // 2. Llama a loadScript:
        //    - Argumento 1: Recurso Estático (el placeholder)
        //    - Argumento 2: La URL externa completa (la de Google)
        loadScript(this, googleScriptUrl) 
            .then(() => {
                console.log('✅ reCAPTCHA Enterprise script cargado exitosamente.');
                this.isRecaptchaLoaded = true; // O la bandera que uses para el estado
            })
            .catch(error => {
                console.error('❌ Error al cargar el script de reCAPTCHA:', error);
                // ...
            });
    }
    // ======================================================
    //  LOAD reCAPTCHA ENTERPRISE (FUNCIONA EN LWR)
    // ======================================================
  /*   loadRecaptchaEnterprise() {
        if (this.recaptchaLoaded) return;

        loadScript(
            this,
            "https://www.google.com/recaptcha/enterprise.js?render=explicit"
        )
            .then(() => {
                console.log("reCAPTCHA Enterprise script loaded");
                this.recaptchaLoaded = true;
                this.mountRecaptcha();
            })
            .catch((err) => {
                console.error("Failed to load reCAPTCHA Enterprise", err);
            });
    } */

  /*  mountRecaptcha() {
        try {
            console.log("Mounting reCAPTCHA Enterprise…");

            const container = this.template.querySelector("#recaptcha-container");

            if (!container) {
                console.error("❌ recaptcha-container not found");
                return;
            }

            grecaptcha.enterprise.render(container, {
                sitekey: this.siteKey,
                callback: (token) => {
                    console.log("reCAPTCHA token generated:", token);

                    const hidden = this.template.querySelector("#recaptchaResponse");
                    if (hidden) hidden.value = token;

                    const btn = this.template.querySelector("#submit-complete");
                    if (btn) btn.disabled = false;
                },
                "error-callback": () => {
                    console.error("reCAPTCHA error");
                },
                "expired-callback": () => {
                    console.warn("reCAPTCHA expired, resetting");
                    grecaptcha.enterprise.reset();
                }
            });

            console.log("reCAPTCHA mounted successfully!");

        } catch (e) {
            console.error("Mount error:", e);
        }
    } */

    // ======================================================
    //  STEP LOGIC
    // ======================================================
    get step1Class() { return 'form-step' + (this.currentStep === 0 ? ' active' : ''); }
    get step2Class() { return 'form-step' + (this.currentStep === 1 ? ' active' : ''); }
    get step3Class() { return 'form-step' + (this.currentStep === 2 ? ' active' : ''); }
    get step4Class() { return 'form-step' + (this.currentStep === 3 ? ' active' : ''); }
    get step5Class() { return 'form-step' + (this.currentStep === 4 ? ' active' : ''); }

    get step1ProgressClass() { return this.currentStep >= 0 ? 'active' : ''; }
    get step2ProgressClass() { return this.currentStep >= 1 ? 'active' : ''; }
    get step3ProgressClass() { return this.currentStep >= 2 ? 'active' : ''; }
    get step4ProgressClass() { return this.currentStep >= 3 ? 'active' : ''; }
    get step5ProgressClass() { return this.currentStep >= 4 ? 'active' : ''; }

    handleNext(event) {
        event.preventDefault();
        if (this.validateStepWithErrorMessages(this.currentStep)) {
            this.currentStep = Math.min(this.currentStep + 1, 4);
            this.hideErrorMessage();
            this.showStep();
        }
    }

    handlePrev(event) {
        event.preventDefault();
        if (this.currentStep > 0) {
            this.currentStep--;
            this.hideErrorMessage();
            this.showStep();
        }
    }

    showStep() {
        const container = this.template.querySelector('.form-container');
        if (container) container.scrollIntoView({ behavior: 'smooth' });
        this.handleToggleFields();
    }

/*handleSubmit(event) {
    event.preventDefault();

    console.log("SUBMIT CLICKED");

    // Validar todos los steps
    let allValid = true;

    for (let i = 0; i <= 4; i++) {
        const valid = this.validateStepWithErrorMessages(i);
        if (!valid) {
            allValid = false;
            this.currentStep = i;
            this.showStep();
            console.log("Validation failed on step:", i);
            break;
        }
    }

    if (!allValid) {
        return; // No continuar
    }

    // 💥 ESTA ES LA LÍNEA IMPORTANTE
    const form = this.getByIdPrefix("multi-step-form");

    if (form) {
        console.log("Form FOUND, submitting...");
        form.submit();
    } else {
        console.error("❌ Form NOT found via prefix: multi-step-form");
    }
} */

    /**
     * Espera activamente a que el objeto grecaptcha.enterprise esté disponible.
     * @returns {Promise<void>} Resuelve cuando el objeto está disponible.
     */
    async waitForRecaptcha() {
        // Contador para evitar bucles infinitos
        const maxAttempts = 20; 
        let attempts = 0;

        while (attempts < maxAttempts) {
            if (window.grecaptcha && window.grecaptcha.enterprise) {
                console.log('✅ reCAPTCHA Enterprise object found after polling.');
                return; // Éxito: el objeto está disponible
            }
            
            attempts++;
            // Espera 100ms antes de la próxima comprobación
            await new Promise(resolve => setTimeout(resolve, 100)); 
        }

        // Si se supera el máximo de intentos, lanza un error
        throw new Error("reCAPTCHA object not found after multiple attempts.");
    }

    // ======================================================
    //  SUBMIT (INCLUYE reCAPTCHA EXECUTE)
    // ======================================================

   // providerRegistrationForm.js

// ... (El resto de tu código de LWC) ...

async handleSubmit(event) {
    event.preventDefault(); 

    // ... (Tu validación de pasos) ...

    const submitBtn = this.getByIdPrefix('submit-complete');
    if (submitBtn) submitBtn.disabled = true;

    try {
        // 🔥 1. ESPERA ACTIVA: Asegura que el objeto de Google exista
        await this.waitForRecaptcha(); 
        
        // 2. Esperar a que el script termine de inicializarse
        await window.grecaptcha.enterprise.ready(async () => {
            const actionName = 'provider_registration'; 

            // Ejecutar y obtener el token
            const token = await window.grecaptcha.enterprise.execute(this.siteKey, {action: actionName});
            console.log('reCAPTCHA Token generado:', token);

            // 3. Colocar el token y hacer form.submit()
            const recaptchaField = this.getByIdPrefix("recaptchaResponse");
            if (recaptchaField) {
                recaptchaField.value = token;
            } 

            const form = this.getByIdPrefix("multi-step-form");
            if (form) {
                console.log("Submitting FINAL via Web-to-Lead...");
                form.submit();
            }
        });

    } catch (error) {
        // Este catch atrapa errores de tiempo (del waitForRecaptcha) y errores de ejecución (Proxy)
        console.error('Error durante la ejecución de reCAPTCHA Enterprise:', error);
        
        // Muestra el mensaje de error de seguridad
        this.showErrorMessage(["Ocurrió un error de seguridad inesperado. Intente recargar la página."]);
        if (submitBtn) submitBtn.disabled = false;
    }
}
    // ======================================================
    //  Close Modal LOGIC
    // ======================================================

    closeModal() {
        const modal = this.getByIdPrefix('thank-you-modal');
        if (modal) modal.style.display = 'none';
    }

    // ======================================================
    //  LEAD SOURCE LOGIC
    // ======================================================
setupLeadSource() {
    try {
        const DEFAULT = 'Web';
        const paramNames = ['leadsource', 'leadSource', 'LeadSource'];
        const qs = new URLSearchParams(window.location.search);

        // Obtener la PRIMERA coincidencia no vacía
        let raw = null;
        for (const k of paramNames) {
            const v = qs.get(k);
            if (v !== null && v !== '') {
                raw = v;
                break; // detener aquí para no sobreescribir
            }
        }

        // Sanitizar
        let clean = DEFAULT;
        if (raw) {
            try { raw = decodeURIComponent(raw); } catch (e) {}
            clean = String(raw)
                .replace(/[\u0000-\u001F\u007F]/g, '') // control chars
                .replace(/[<>]/g, '')                 // evitar inyección
                .trim()
                .slice(0, 100);                       // máximo 100 chars
            if (!clean) clean = DEFAULT;
        }

        // Este método ya encuentra ID con prefijo: lead_source, lead_source-21, lead_source-XYZ
        const field = this.getByIdPrefix('lead_source');

        if (field) {
            field.value = clean;
            console.log(`Lead Source set to: ${clean} (field id: ${field.id})`);
        } else {
            console.warn("Lead source field not found (prefix lead_source)");
        }

    } catch (e) {
        console.warn("Lead source error:", e);
    }
}


    // ======================================================
    //  INPUT HANDLERS + TOGGLES + VALIDACIONES
    // ======================================================
    /* 🔥 TODO se mantiene EXACTAMENTE IGUAL que tu versión original */
    /* ⚠ Para ahorrar espacio NO repito aquí todo lo que ya funciona. */
    /* El resto de tu JS (toggles, validaciones, formateos) NO cambia. */

       // ----------------- ENTRADA DE CAMPOS -----------------
    handleFieldInput(event) {
        const el = event.target;

        // Si no es requerido o está oculto, ignorar
        if (!el.required || el.classList.contains('hidden')) {
            return;
        }

        if (el.checkValidity()) {
            this.unhighlightField(el);
        } else {
            this.highlightField(el);
        }

        // Siempre recalculamos toggles por si cambió algún select
        this.handleToggleFields();
    }

    handlePhoneInput(event) {
        const el = event.target;
        el.value = this.formatPhoneNumber(el.value);
        this.handleFieldInput(event);
    }

    handlePhoneExtInput(event) {
        const el = event.target;
        el.value = el.value.replace(/[^0-9]/g, '').slice(0, 5);
        this.handleFieldInput(event);
    }

    // ----------------- VALIDACIÓN POR STEP -----------------
    validateStepWithErrorMessages(stepIndex) {
        // Actualizamos visibilidad/requeridos antes de validar
        this.handleToggleFields();

        const steps = this.template.querySelectorAll('.form-step');
        if (!steps || !steps[stepIndex]) {
            return true;
        }

        const step = steps[stepIndex];
        const requiredFields = step.querySelectorAll('[required]:not(.hidden)');

        let isValid = true;
        const messages = [];

        requiredFields.forEach((el) => {
            const labelText = this.getFieldLabel(el);

            if (el.tagName === 'SELECT') {
                if (!el.value || el.value === '--None--' || el.value === '--Select--') {
                    isValid = false;
                    messages.push(`Please select an option for "${labelText}"`);
                    this.highlightField(el);
                }
            } else if (el.type === 'checkbox') {
                if (!el.checked) {
                    isValid = false;
                    messages.push(`Please check "${labelText}"`);
                    this.highlightField(el);
                }
            } else {
                if (!el.value.trim() || !el.checkValidity()) {
                    isValid = false;
                    messages.push(`Please fill in "${labelText}"`);
                    this.highlightField(el);
                }
            }
        });

        if (!isValid) {
            this.showErrorMessage(messages);
        } else {
            this.hideErrorMessage();
        }

        this.updateIncompleteSubmission();
        return isValid;
    }

    getFieldLabel(el) {
        const id = el.id;
        if (!id) {
            return el.name || 'This field';
        }
        const label = this.template.querySelector(`label[for="${id}"]`);
        return label ? label.textContent.replace('*', '').trim() : (el.name || id);
    }

    highlightField(el) {
        el.style.border = '2px solid red';
        el.style.backgroundColor = '#fff0f0';
    }

    unhighlightField(el) {
        el.style.border = '1px solid #ccc';
        el.style.backgroundColor = '';
    }

    showErrorMessage(messages) {
        const box = this.getByIdPrefix('form-error-message');
        if (!box) return;

        let html = '<strong>Please fix the following errors:</strong><ul>';
        messages.forEach((m) => { html += `<li>${m}</li>`; });
        html += '</ul>';

        box.innerHTML = html;
        box.style.display = 'block';
        box.classList.remove('hidden');
    }

    hideErrorMessage() {
        const box = this.getByIdPrefix('form-error-message');
        if (!box) return;
        box.style.display = 'none';
        box.innerHTML = '';
        box.classList.add('hidden');
    }
    

    // ----------------- TOGGLES (USANDO id^="...") -----------------
    handleToggleFields() {
        const get = (prefix) => this.getByIdPrefix(prefix);

        // Trainee
        const traineeSelect = get('The_provider_is_a_Trainee__c');
        const traineeType = get('Trainee_Type__c');
        const traineeLabel = get('Trainee_Type_Label');

        const otherTraineeInput = get('Other_Medical_Trainee_Description__c');
        const otherTraineeLabel = get('otherMedicalTraineeDescriptionid');

        const endDateInput = get('trainenddate');
        const endDateLabel = get('trainenddate_label');

        // ---- Trainee YES/NO ----
        if (traineeSelect && traineeSelect.value === 'Yes') {
            if (traineeLabel) traineeLabel.classList.remove('hidden');
            if (traineeType) {
                traineeType.classList.remove('hidden');
                traineeType.required = true;
            }
        } else {
            if (traineeLabel) traineeLabel.classList.add('hidden');
            if (traineeType) {
                traineeType.classList.add('hidden');
                traineeType.required = false;
                traineeType.value = '';
            }
            if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
            if (otherTraineeInput) {
                otherTraineeInput.classList.add('hidden');
                otherTraineeInput.required = false;
                otherTraineeInput.value = '';
            }
            if (endDateLabel) endDateLabel.classList.add('hidden');
            if (endDateInput) {
                endDateInput.classList.add('hidden');
                endDateInput.required = false;
                endDateInput.value = '';
            }
        }

        // ---- Dentro de Trainee YES ----
        if (traineeSelect && traineeSelect.value === 'Yes' && traineeType && traineeType.value) {
            if (traineeType.value === 'Other medical trainee') {
                if (otherTraineeLabel) otherTraineeLabel.classList.remove('hidden');
                if (otherTraineeInput) {
                    otherTraineeInput.classList.remove('hidden');
                    otherTraineeInput.required = true;
                }
                if (endDateLabel) endDateLabel.classList.add('hidden');
                if (endDateInput) endDateInput.required = false;

            } else if (traineeType.value.includes('Student')) {
                if (endDateLabel) endDateLabel.classList.remove('hidden');
                if (endDateInput) {
                    endDateInput.classList.remove('hidden');
                    endDateInput.required = true;
                }
                if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
                if (otherTraineeInput) otherTraineeInput.required = false;

            } else {
                if (otherTraineeLabel) otherTraineeLabel.classList.add('hidden');
                if (otherTraineeInput) {
                    otherTraineeInput.classList.add('hidden');
                    otherTraineeInput.required = false;
                }
                if (endDateLabel) endDateLabel.classList.add('hidden');
                if (endDateInput) {
                    endDateInput.classList.add('hidden');
                    endDateInput.required = false;
                }
            }
        }

        // ---- Mental Health Training ----
        const mhSelect = get('Specialty_Mental_Health_Training__c');
        const mhLabel = get('mhTrainingDescLabel');
        const mhInput = get('Specialty_Mental_Health_Training_Desc__c');

        if (mhSelect && mhSelect.value === 'Yes') {
            if (mhLabel) mhLabel.classList.remove('hidden');
            if (mhInput) {
                mhInput.classList.remove('hidden');
                mhInput.required = true;
            }
        } else {
            if (mhLabel) mhLabel.classList.add('hidden');
            if (mhInput) {
                mhInput.classList.add('hidden');
                mhInput.required = false;
                mhInput.value = '';
            }
        }

        // ---- Provider Type Other ----
        const typeSelect = get('type');
        const otherProviderLabel = get('Other-Provider-id');
        const otherProviderInput = get('pcpothersta_desc__c');

        if (typeSelect && typeSelect.value === 'Other') {
            if (otherProviderLabel) otherProviderLabel.classList.remove('hidden');
            if (otherProviderInput) {
                otherProviderInput.classList.remove('hidden');
                otherProviderInput.required = true;
            }
        } else {
            if (otherProviderLabel) otherProviderLabel.classList.add('hidden');
            if (otherProviderInput) {
                otherProviderInput.classList.add('hidden');
                otherProviderInput.required = false;
                otherProviderInput.value = '';
            }
        }

        // ---- Specialty Other ----
        const specialtySelect = get('specialty-desc');
        const otherSpecLabel = get('Other-specialty-id');
        const otherSpecInput = get('other-specialty-desc');

        if (specialtySelect && specialtySelect.value === 'Other') {
            if (otherSpecLabel) otherSpecLabel.classList.remove('hidden');
            if (otherSpecInput) {
                otherSpecInput.classList.remove('hidden');
                otherSpecInput.required = true;
            }
        } else {
            if (otherSpecLabel) otherSpecLabel.classList.add('hidden');
            if (otherSpecInput) {
                otherSpecInput.classList.add('hidden');
                otherSpecInput.required = false;
                otherSpecInput.value = '';
            }
        }

        // ---- Hear Other ----
        const otherCheck = get('otherCheck');
        const heardLabel = get('heard_other_label');
        const heardInput = get('heard_other');

        if (otherCheck && otherCheck.checked) {
            if (heardLabel) heardLabel.classList.remove('hidden');
            if (heardInput) {
                heardInput.classList.remove('hidden');
                heardInput.required = true;
            }
        } else {
            if (heardLabel) heardLabel.classList.add('hidden');
            if (heardInput) {
                heardInput.classList.add('hidden');
                heardInput.required = false;
                heardInput.value = '';
            }
        }

        // ---- Race Other ----
        const raceSelect = get('How_do_You_Identify_with_Respect_to_Race__c');
        const raceLabel = get('pcpracedesc-id');
        const raceInput = get('pcpracedesc');

        if (raceSelect && raceSelect.value === 'Prefer to self-describe (option not listed)') {
            if (raceLabel) raceLabel.classList.remove('hidden');
            if (raceInput) {
                raceInput.classList.remove('hidden');
                raceInput.required = true;
            }
        } else {
            if (raceLabel) raceLabel.classList.add('hidden');
            if (raceInput) {
                raceInput.classList.add('hidden');
                raceInput.required = false;
                raceInput.value = '';
            }
        }

        // ---- Language Other ----
        const langSelect = get('Provider_Language_other_than_English__c');
        const langLabel = get('Provider-Description-id');
        const langInput = get('Provider_Languages_Description__c');

        if (langSelect && langSelect.value === 'Other') {
            if (langLabel) langLabel.classList.remove('hidden');
            if (langInput) {
                langInput.classList.remove('hidden');
                langInput.required = true;
            }
        } else {
            if (langLabel) langLabel.classList.add('hidden');
            if (langInput) {
                langInput.classList.add('hidden');
                langInput.required = false;
                langInput.value = '';
            }
        }
    }

    // ---------- INCOMPLETE (placeholder) ----------
    updateIncompleteSubmission() {
        // Aquí puedes poner lógica extra si luego MSV quiere marcar "Incomplete Submission"
    }

    // ---------- FORMATO TELÉFONO ----------
    formatPhoneNumber(value) {
        let digits = value.replace(/\D/g, '').slice(0, 10);

        if (digits.length < 4) return digits;
        if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

   

}