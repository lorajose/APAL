import {
    LightningElement,
    api,
    track,
    wire
} from 'lwc';
import {
    loadScript
} from 'lightning/platformResourceLoader';
import TAILWIND from '@salesforce/resourceUrl/tailwind_static';
import createCase from '@salesforce/apex/GPCaseService.createCase';
import saveStepData from '@salesforce/apex/GPCaseService.saveStepData';
import getAuthoritativeCaseId from '@salesforce/apex/GPCaseService.getAuthoritativeCaseId';
import saveMedications from '@salesforce/apex/GPCaseService.saveMedications';
import saveSubstances from '@salesforce/apex/GPCaseService.saveSubstances';
import saveScreeners from '@salesforce/apex/GPCaseService.saveScreeners';
import saveConcerns from '@salesforce/apex/GPCaseService.saveConcerns';
import saveSafetyRisks from '@salesforce/apex/GPCaseService.saveSafetyRisks';
import getCaseFullData from '@salesforce/apex/GPCaseService.getCaseFullData';
import { MEDICATION_INDEX, SUBSTANCE_INDEX, SCREENER_INDEX, SAFETY_RISK_INDEX } from 'c/gpCaseCatalogs';
import {
    CurrentPageReference,
    NavigationMixin
} from 'lightning/navigation';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';

const createEmptyForm = () => ({
    basics: {},
    presenting: {},
    priorDx: {},
    suicide: {},
    violence: {},
    psychosisMania: {},
    familyTrauma: {},
    medicalFlags: {},
    homeSafety: {},
    cognition: {},
    supports: {},
    screeners: [],
    substances: [],
    medications: [],
    concerns: [],
    safetyRisks: []
});

const createInitialStepStatus = () => ({
    1: 'active',
    2: 'locked',
    3: 'locked',
    4: 'locked',
    5: 'locked',
    6: 'locked',
    7: 'locked',
    8: 'locked',
    9: 'locked',
    10: 'locked',
    11: 'locked',
    12: 'locked',
    13: 'locked',
    14: 'locked',
    15: 'locked'
});

const createInitialCollectionModes = () => ({
    10: 'grid',
    11: 'grid',
    12: 'grid'
});

const buildNameIndex = (catalog, labelKey) => {
    return Object.entries(catalog).reduce((acc, [id, meta]) => {
        if (!meta) return acc;
        const label = (meta[labelKey] || '').toString().toLowerCase();
        if (label) {
            acc[label] = id;
        }
        return acc;
    }, {});
};

const MEDICATION_NAME_TO_ID = buildNameIndex(MEDICATION_INDEX, 'title');
const SUBSTANCE_NAME_TO_ID = buildNameIndex(SUBSTANCE_INDEX, 'name');
const SCREENER_NAME_TO_ID = buildNameIndex(SCREENER_INDEX, 'name');
const SAFETY_RISK_NAME_TO_ID = buildNameIndex(SAFETY_RISK_INDEX, 'name');
// Importa el nuevo servicio de validación
import {
    validateStep,
    validateAll
} from './validationService';
export default class gpCaseCreator extends NavigationMixin(LightningElement) {
    /* ------------------------------------------------------------
        MODE + CURRENT STEP
    ------------------------------------------------------------ */
    @track mode = 'intake';
    @track currentStep = 1;
    @api recordId;
    @api availableActions = [];
    @api providerId;
    @api practiceAccountId;
    @api patientContactId;
    @track caseId;
    tailwindLoaded = false;
    _caseType = 'General_Psychiatry';
    formLoadedFromServer = false;
    hasConnected = false;
    initializingCaseContext = false;

    @track stepsReady = false;
    @track inlineMessage = null;
    @track reviewSummaryReady = false;
    isSaving = false;
    // Almacena los resultados de la validación de todos los pasos: { 1: { isValid, hardErrors, softWarnings }, ... }
    @track validationResults = {};
    /* ------------------------------------------------------------
        CENTRAL FORM STORE (15 STEPS)
    ------------------------------------------------------------ */
    @track form = createEmptyForm();
    @api
    get caseType() {
        return this._caseType;
    }
    set caseType(value) {
        this._caseType = value || 'General_Psychiatry';
    }
    @wire(CurrentPageReference)
    parsePageReference(pageRef) {
        if (!pageRef || !pageRef.state) {
            return;
        }
        const { state } = pageRef;
        const caseTypeParam = state.c__caseType;
        if (caseTypeParam) {
            this.caseType = caseTypeParam;
        }
        const recordIdFromState = state.c__recordId || state.recordId;
        if (recordIdFromState && !this.recordId) {
            this.recordId = recordIdFromState;
        }
        const authoritativeCaseId = state.c__authoritativeCaseId || state.c__caseId;
        if (authoritativeCaseId) {
            this.caseId = authoritativeCaseId;
        }
        if (this.hasConnected && (recordIdFromState || authoritativeCaseId)) {
            this.initializeCaseContext();
        }
    }
    /* ------------------------------------------------------------
        STEP DEFINITIONS (REQUIRED FOR SIDEBAR)
    ------------------------------------------------------------ */
    steps = [{
        label: 'Basics',
        value: 1
    }, {
        label: 'Presenting & Availability',
        value: 2
    }, {
        label: 'Prior Diagnosis & Utilization',
        value: 3
    }, {
        label: 'Safety: Suicide Risk',
        value: 4
    }, {
        label: 'Safety: Homicide / Violence',
        value: 5
    }, {
        label: 'Psychosis, Mania & Red Flags',
        value: 6
    }, {
        label: 'Family & Trauma',
        value: 7
    }, {
        label: 'Home Safety, Stressors & Supports',
        value: 8
    }, {
        label: 'Orientation & Cognition',
        value: 9
    }, {
        label: 'Medications',
        value: 10
    }, {
        label: 'Substances',
        value: 11
    }, {
        label: 'Screeners',
        value: 12
    }, {
        label: 'Concern Review & Add',
        value: 13
    }, {
        label: 'Safety Risks (General Psych)',
        value: 14
    }, {
        label: 'Review',
        value: 15
    }];
    /* ------------------------------------------------------------
        STEP STATUS (UI VISUAL STATE) - Actualizado para 4 estados + 1 (final-completed)
    ------------------------------------------------------------ */
    @track stepStatus = createInitialStepStatus();
    /* ------------------------------------------------------------
        GETTERS para visibilidad y errores de paso
    ------------------------------------------------------------ */
    get currentSectionName() {
        return (this.steps.find(s =>
            s
            .value === this
            .currentStep
        ) || {}).label;
    }
    // Mapea errores de validationResults a un formato amigable para el componente hijo: { fieldPath: 'Mensaje' }
    get currentStepErrors() {
        const result = this
            .validationResults[this
                .currentStep];
        if (!result || !result
            .hardErrors)
            return {};
        return result.hardErrors
            .reduce((
                acc, error) => {
                acc[error
                        .path] =
                    error
                    .message;
                return acc;
            }, {});
    }
    // 🔥 NUEVO GETTER PARA PERSISTENCIA DE DATOS
    get currentStepData() {
        const key = this
            .getStepFormKey(
                this.currentStep);
        // Devuelve el objeto de datos del paso actual, o un objeto vacío si no existe.
        // Esto pre-llena los campos del componente hijo.
        return this.form[key] || {};
    }
    get isUpdateMode() {
        return this.formLoadedFromServer;
    }
    // Getters de visibilidad (se mantienen igual)
    get isStep1() {
        return this.currentStep ===
            1;
    }
    get isStep2() {
        return this.currentStep ===
            2;
    }
    get isStep3() {
        return this.currentStep ===
            3;
    }
    get isStep4() {
        return this.currentStep ===
            4;
    }
    get isStep5() {
        return this.currentStep ===
            5;
    }
    get isStep6() {
        return this.currentStep ===
            6;
    }
    get isStep7() {
        return this.currentStep ===
            7;
    }
    get isStep8() {
        return this.currentStep ===
            8;
    }
    get isStep9() {
        return this.currentStep ===
            9;
    }
    get isStep10() {
        return this.currentStep ===
            10;
    }
    get isStep11() {
        return this.currentStep ===
            11;
    }
    get isStep12() {
        return this.currentStep ===
            12;
    }
    get isStep13() {
        return this.currentStep ===
            13;
    }
    get isStep14() {
        return this.currentStep ===
            14;
    }
    get isStep15() {
        return this.currentStep ===
            15;
    }
    @track collectionModes = createInitialCollectionModes();

    get currentDescription() {
        const guidedCopy = 'Guided selection → details → review';
        switch (this.currentStep) {
            case 1:
                return 'Subject, Priority & Description.';
            case 2:
                return 'Capture primary questions, domains, and presenting context together.';
            case 3:
                return 'Capture history, utilization, and diagnosis notes together.';
            case 4:
                return 'Capture ideation, protective factors, and access to means.';
            case 5:
                return 'Track ideation and any weaponized risk details.';
            case 6:
                return 'Capture symptom clusters and note any medical contributors.';
            case 7:
                return 'Document recent trauma, safety concerns, and relevant family history.';
            case 8:
                return 'Confirm safety status, stressors, and support systems.';
            case 9:
                return 'Capture orientation status and cognition notes when needed.';
            case 10:
                return this.collectionModes[10] === 'wizard'
                    ? guidedCopy
                    : 'Manage current list; Add more opens wizard';
            case 11:
                return this.collectionModes[11] === 'wizard'
                    ? guidedCopy
                    : 'Manage current substance list; Add more opens wizard';
            case 12:
                return this.collectionModes[12] === 'wizard'
                    ? guidedCopy
                    : 'Manage existing screeners; Add more opens wizard';                                
            case 13:
                return 'Review everything captured so far and add any missing concerns.';
            case 14:
                return 'Track high-level risks across service lines.';
            case 15:
                return 'Final check before saving. Use the links to jump back if needed.';
            default:
                return 'Step details and guidance.';
        }
    }
    /* ------------------------------------------------------------
        MÉTODOS DE VALIDACIÓN Y ESTADO
    ------------------------------------------------------------ */
    // Determina el nuevo estado de un paso basado en el resultado de validación
    updateStepStatus(step) {
        const result = this
            .validationResults[
                step];
        if (!result) return;
        // Si es el paso activo, siempre es 'active' (verde claro)
        if (step === this
            .currentStep) {
            this.stepStatus[step] =
                'active';
        }
        // Si pasó la validación HARD y no hay advertencias SOFT (VERDE con CHECK)
        else if (result.isValid &&
            result
            .softWarnings.length ===
            0
        ) {
            this.stepStatus[step] =
                'final-completed';
        }
        // Si pasó la validación HARD, pero tiene advertencias SOFT (NARANJA/WARNING)
        else if (result.isValid &&
            result
            .softWarnings.length > 0
        ) {
            this.stepStatus[step] =
                'warning';
        }
        // Si falló la validación HARD (ROJO/IN-PROGRESS)
        else if (!result.isValid) {
            this.stepStatus[step] =
                'in-progress';
        }
        // Caso por defecto (Si no ha sido validado, se queda en su estado anterior, p.ej. 'locked' o 'warning')
        console.warn(
    `UPDATE STATUS → STEP ${step} → ${this.stepStatus[step]}`
   );
    } 

    // Ejecuta la validación de todos los pasos y actualiza la barra lateral
    runFullValidation(force = false) {
        this.validationResults =
            validateAll(this.form);
        for (const step in this
                .validationResults) {
            // Solo actualiza el estado si el paso no está "locked". Si está locked, no se valida
            if (force || this.stepStatus[
                    step] !==
                'locked') {
                this.updateStepStatus(
                    Number(
                        step));
            }
        }
    }
    /* ------------------------------------------------------------
        SIDEBAR STYLE FORMATTER (Añadido 'final-completed')
    ------------------------------------------------------------ *//**
 * Propiedad getter que transforma la lista de pasos base (this.steps)
 * en una lista formateada con la clase CSS de estado y la clickeabilidad.
 */
get stepsFormatted() {
    console.warn('--- INICIANDO FORMATO DE PASOS (stepsFormatted) ---');
    console.warn('Estado de validación actual (this.stepStatus):', this.stepStatus);
    
    // Itera sobre cada paso base
    return this.steps.map(s => {
        // 1. Obtener el estado
        const status = this.stepStatus[s.value];
        let css = "step-item ";
        
        console.warn(`\nProcesando Paso ${s.value} (${s.label}):`);
        console.warn(` -> Estado encontrado: ${status}`);

        // 2. Asignación de la clase CSS de estado
        if (status === 'active') {
            css += "step-active";
        } else if (status === 'final-completed') {
            css += "step-final-completed"; // Clase Verde con Check
        } else if (status === 'completed') {
            css += "step-completed"; // Gris claro
        } else if (status === 'warning') {
            css += "step-warning";
        } else if (status === 'in-progress') {
            css += "step-in-progress";
        } else {
            css += "step-locked"; // locked (default)
        }
        
        // 3. Determinar la clickeabilidad
        // Permite saltar a cualquier paso que no esté 'locked'
        const isClickable = status !== 'locked';
        
        // 4. Determinar si mostrar el ícono de check
        const isCompleteAndChecked = status === 'final-completed';
        
        console.warn(` -> Clase CSS final: ${css}`);
        console.warn(` -> ¿Es clickeable?: ${isClickable}`);
        console.warn(` -> ¿Mostrar check?: ${isCompleteAndChecked}`);

        // 5. Retornar el objeto de paso formateado
        return {
            ...s,
            cssClass: css,
            isClickable,
            isCompleteAndChecked
        };
    });
}
    /* ------------------------------------------------------------
        INIT: Load Tailwind + resolve CaseId + Initial Validation
    ------------------------------------------------------------ */
    async connectedCallback() {
        this.hasConnected = true;
        console.warn("🔥 FORM BASICS LOADED:", JSON.stringify(this.form.basics));


    /* ------------------------------------------------------------
       1) Cargar Tailwind desde static resource
    ------------------------------------------------------------ */
    loadScript(this, TAILWIND + '/tailwindLoader.js')
        .then(() => console.log("TAILWIND FULL LOADED"))
        .catch(err => console.error(err));

    /* ------------------------------------------------------------
       2) Restaurar datos guardados del formulario (persistencia)
    ------------------------------------------------------------ */
    const saved = localStorage.getItem('gpCaseForm');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.homesafety && !parsed.homeSafety) {
            parsed.homeSafety = parsed.homesafety;
        }
        if (parsed.orientation && !parsed.cognition) {
            parsed.cognition = parsed.orientation;
        }
        delete parsed.homesafety;
        delete parsed.orientation;
        this.form = parsed;
    }

    /* ------------------------------------------------------------
       3) Evaluar Step 1 al recargar página (auto-activar steps)
    ------------------------------------------------------------ */
    const s = this.form.basics.Subject?.trim() || "";
    const d = this.form.basics.Description?.trim() || "";

    const requiredComplete = s.length > 0 && d.length > 0;

    this.stepsReady = true;


    if (requiredComplete) {
        // Steps que van en warning
        const stepsWarning = [2, 4, 5, 8, 9, 13];
        stepsWarning.forEach(step => {
            this.stepStatus[step] = "warning";
        });

        // Steps normales completados en gris
        const normalSteps = [3, 6, 7, 10, 11, 12, 14, 15];
        normalSteps.forEach(step => {
            this.stepStatus[step] = "completed";
        });
    } 
    else {
        // Si faltan datos requeridos → reset total
        for (let step = 2; step <= 15; step++) {
            this.stepStatus[step] = "locked";
        }
        this.stepStatus[1] = "active";
    }

    await this.initializeCaseContext();
}

    async initializeCaseContext() {
        if (this.initializingCaseContext) {
            return;
        }
        if (!this.recordId && !this.caseId) {
            return;
        }
        this.initializingCaseContext = true;
        try {
            if (!this.caseId && this.recordId) {
                const parentId = await getAuthoritativeCaseId({
                    recordId: this.recordId
                });
                this.caseId = parentId || this.recordId;
            }

            if (this.caseId) {
                const loadedFromServer = await this.loadFullCaseData();
                const stepsToActivateWarning = [2, 4, 5, 8, 9, 13];
                stepsToActivateWarning.forEach(step => {
                    if (this.stepStatus[step] === "locked") {
                        this.stepStatus[step] = "warning";
                    }
                });

                if (!loadedFromServer) {
                    this.runFullValidation();
                }
            }
        } catch (err) {
            this.toast('Error', err.body?.message || err.message, 'error');
        } finally {
            this.initializingCaseContext = false;
        }
    }

    async loadFullCaseData() {
        if (!this.caseId) {
            this.formLoadedFromServer = false;
            return false;
        }
        try {
            const serverData = await getCaseFullData({
                caseId: this.caseId
            });
            if (serverData) {
                this.form = this.normalizeServerForm(serverData);
                localStorage.setItem('gpCaseForm', JSON.stringify(this.form));
                this.formLoadedFromServer = true;
                this.runFullValidation(true);
                return true;
            }
        } catch (error) {
            console.warn('Failed to load existing case data', error);
        }
        this.formLoadedFromServer = false;
        return false;
    }

    /* ------------------------------------------------------------
        MANEJO DE EVENTOS DE COMPONENTES HIJOS
    ------------------------------------------------------------ */
    // Este manejador permite revalidar el paso actual cuando los datos cambian en el hijo
 async handleDataUpdated(event) {
    if (this.reviewSummaryReady && this.currentStep !== 15) {
        this.reviewSummaryReady = false;
    }
   console.warn("🔥 PARENT RECEIVED:", JSON.stringify(event.detail));
    console.warn("🔥 FORM BEFORE:", JSON.stringify(this.form.basics));

    const data = event.detail || {};
    this.mergeFormData(data);
    console.warn("🔥 FORM AFTER:", JSON.stringify(this.form.basics));


    // Guardar todo en localStorage (persistencia verdadera)
    localStorage.setItem('gpCaseForm', JSON.stringify(this.form));

    // Validar el step actual
    const result = validateStep(this.currentStep, this.form);
    this.validationResults[this.currentStep] = result;

    this.updateStepStatus(this.currentStep);

    if (this.caseId) {
        const step = this.currentStep;
        try {
            if (step >= 10 && step <= 14) {
                await this.persistRelatedCollections(step);
            } else if (this.formLoadedFromServer &&
                       step >= 1 &&
                       step <= 9 &&
                       this.isObjectPayload(data)) {
                await saveStepData({
                    caseId: this.caseId,
                    stepData: data
                });
            }
        } catch (error) {
            const message = error?.body?.message || error?.message || 'Unexpected error';
            this.toast('Error', message, 'error');
        }
    }

    /* ------------------------------------------------------------
       🔥 LÓGICA DE ACTIVACIÓN BASADA EN STEP 1 SIN DAR "NEXT"
    ------------------------------------------------------------ */
    if (this.currentStep === 1 && this.mode !== 'manage') {
        const s = this.form.basics.Subject?.trim() || "";
        const d = this.form.basics.Description?.trim() || "";

        const requiredComplete = s.length > 0 && d.length > 0;

        if (requiredComplete) {
            // Steps clave → Warning
            const stepsWarning = [2, 4, 5, 8, 9, 13];
            stepsWarning.forEach(step => {
                if (this.stepStatus[step] === 'locked') {
                    this.stepStatus[step] = 'warning';
                }
            });

            // Steps normales → Gris (completed)
            const normalSteps = [3, 6, 7, 10, 11, 12, 14, 15];
            normalSteps.forEach(step => {
                if (this.stepStatus[step] === 'locked') {
                    this.stepStatus[step] = 'completed';
                }
            });
        } 
        else {
            // ❌ Si faltan requeridos → RESET TOTAL
            for (let step = 2; step <= 15; step++) {
                this.stepStatus[step] = 'locked';
            }
            this.stepStatus[1] = 'active';
        }
    }
}


    /* ------------------------------------------------------------
        MÉTODOS AUXILIARES DE ENFOQUE (Focus)
    ------------------------------------------------------------ */
    // Llama al método focusFirstError del componente hijo actualmente visible
    focusFirstError(errorPath) {
        const stepComponent = this
            .template.querySelector(
                'c-gp-case-step-' +
                this
                .getStepFormKey(this
                    .currentStep));
        if (stepComponent &&
            stepComponent
            .focusFirstError) {
            stepComponent
                .focusFirstError(
                    errorPath);
        }
    }

    navigateToFirstInvalidStep() {
        const firstFailingStep = Object
            .entries(this.validationResults || {})
            .find(([, result]) => result && !result.isValid);
        if (firstFailingStep) {
            const stepNumber = Number(firstFailingStep[0]);
            if (stepNumber) {
                this.currentStep = stepNumber;
                this.stepStatus[stepNumber] = 'active';
            }
        }
    }

    evaluateReviewReady() {
        this.runFullValidation(true);
        const allValid = Object
            .values(this.validationResults || {})
            .every(result => result && result.isValid);
        this.reviewSummaryReady = allValid;
    }
    /* ------------------------------------------------------------
        SIDEBAR → JUMP TO STEP (solo si no está 'locked')
    ------------------------------------------------------------ */
    handleJumpToStep(event) {
        const step = Number(event
            .currentTarget
            .dataset
            .step);
        if (this.stepStatus[
                step] ===
            "locked")
            return; // prevent clicking locked
        // 1. Marcar el paso actual con su estado de validación final antes de saltar
        const currentStep = this
            .currentStep;
        // Solo validamos si el paso actual ya ha sido visitado o no está 'locked'
        if (this.stepStatus[
                currentStep] !==
            'locked') {
            const result =
                validateStep(
                    currentStep,
                    this.form
                );
            this.validationResults[
                    currentStep] =
                result;
            this.updateStepStatus(
                currentStep
            ); // Lo actualiza a final-completed/warning/in-progress
        }
        // 2. Saltar al nuevo paso y marcarlo como 'active'
        this.currentStep = step;
        this.stepStatus[step] =
            'active';
        if (step === 15) {
            this.evaluateReviewReady();
        } else {
            this.reviewSummaryReady = false;
        }
    }
    /* ------------------------------------------------------------
        NEXT BUTTON (core wizard logic con Hard Validation)
    ------------------------------------------------------------ */
    handlePrevious() {
        if (this.currentStep <= 1) {
            return;
        }
        if (this.reviewSummaryReady && this.currentStep === 15) {
            this.reviewSummaryReady = false;
        }
        const leavingStep = this.currentStep;
        const targetStep = Math.max(1, leavingStep - 1);
        this.currentStep = targetStep;
        this.stepStatus[targetStep] = 'active';
        this.inlineMessage = null;

        if (this.validationResults[leavingStep]) {
            this.updateStepStatus(leavingStep);
        }
    }

    async handleNext(event) {
        try {
            const stepData = event
                .detail || {};
            // Debug aid
            console.warn('STEP ' + this.currentStep + ' NEXT payload:', JSON.stringify(stepData));
            const currentStep = this
                .currentStep;
            // 🔥 1. Save in memory store (MOVIDO AQUÍ PARA QUE LA VALIDACIÓN TENGA LOS DATOS ACTUALIZADOS)
            this.mergeFormData(
                stepData);
            // 2. HARD VALIDATION Check (Usando el framework)
            const result =
                validateStep(
                    currentStep,
                    this.form
                );
            this.validationResults[
                    currentStep] =
                result;
            console.warn(
    `NEXT → STEP ${currentStep} VALIDATION RESULT:`,
    JSON.stringify(result)
   );
            if (!result.isValid) {
                this.stepStatus[
                        currentStep
                    ] =
                    'in-progress';
                // Hard validation fails: Block navigation and focus error
                this.toast('Error',
                    'Review the errors in the form to proceed.',
                    'error');
                if (result
                    .hardErrors
                    .length >
                    0) {
                    this.focusFirstError(
                        result
                        .hardErrors[
                            0]
                        .path);
                }
                return; // BLOCKS ADVANCE
            }
            this.inlineMessage = null;
            // 3. APEX Logic (Guardar datos si la validación es OK)
            if (!this.caseId) {
                const baseSeed = currentStep === 1 ? stepData : (this.form.basics || {});
                const seedPayload = this.prepareCaseSeed({ ...(baseSeed || {}) });
                if (seedPayload && seedPayload.Subject) {
                    this.caseId = await createCase({ stepData: seedPayload });
                    // Persist basics immediately after creating the Case
                    await saveStepData({
                        caseId: this.caseId,
                        stepData: this.form.basics || {}
                    });
                    await this.persistAllCollections();
                } else {
                    console.warn('Unable to create case yet. Subject is required.');
                }
            }

            if (this.caseId) {
                if (currentStep <= 9) {
                    await saveStepData({
                        caseId: this.caseId,
                        stepData
                    });
                }
                await this.persistRelatedCollections(currentStep);
            }
            this.advanceStep(currentStep);
        } catch (err) {
            const message = err?.body?.message || err?.message || (typeof err === 'string' ? err : 'Unexpected error');
            this.toast('Error', message, 'error');
        }
    } 
    advanceStep(fromStep) {
        let advancedToStep = null;
        if (fromStep === 1) {
            const stepsToActivateWarning = [2, 4, 5, 8, 9, 13];
            stepsToActivateWarning.forEach(step => {
                if (this.stepStatus[step] === 'locked') {
                    this.stepStatus[step] = 'warning';
                }
            });
            this.currentStep = 2;
            this.stepStatus[2] = 'active';
            advancedToStep = 2;
        } else if (fromStep < 15) {
            this.currentStep += 1;
            this.stepStatus[this.currentStep] = 'active';
            advancedToStep = this.currentStep;
        } else {
            this.mode = 'manage';
        }

        if (advancedToStep === 15) {
            this.evaluateReviewReady();
        } else if (advancedToStep !== null) {
            this.reviewSummaryReady = false;
        }

        if (advancedToStep !== null) {
            this.updateStepStatus(fromStep);
        }
    }
    /* ------------------------------------------------------------
        STEP 15 → FINISH (Final Validation)
    ------------------------------------------------------------ */
    async handleFinish() {
        // Ejecutar validación final para todos los pasos
        this.runFullValidation(true);
        const allStepsValid = Object
            .values(this
                .validationResults)
            .every(res => res
                .isValid);
        if (allStepsValid) {
            this.reviewSummaryReady = true;
            this.toast('Success',
                'All steps are valid. Review the summary before final submission.',
                'success');
        } else {
            this.reviewSummaryReady = false;
            this.toast('Error',
                'The process cannot be completed. Please review the steps marked with an error.',
                'error');
            this.navigateToFirstInvalidStep();
        }
    }

    async handleFinalize() {
        this.runFullValidation(true);
        const allStepsValid = Object.values(this.validationResults).every(res => res.isValid);
        if (!allStepsValid) {
            this.reviewSummaryReady = false;
            this.toast('Error', 'The process cannot be completed. Please review the steps marked with an error.', 'error');
            this.navigateToFirstInvalidStep();
            return;
        }

        if (!this.caseId) {
            this.toast('Error', 'Unable to save related data because the Case has not been created yet.', 'error');
            return;
        }

        this.isSaving = true;
        try {
            const caseId = this.caseId;
            await saveMedications({
                caseId,
                items: this.buildMedicationPayload()
            });
            await saveSubstances({
                caseId,
                items: this.buildSubstancePayload()
            });
            await saveScreeners({
                caseId,
                items: this.buildScreenerPayload()
            });
            await saveConcerns({
                caseId,
                items: this.buildConcernPayload()
            });
            await saveSafetyRisks({
                caseId,
                items: this.buildSafetyRiskPayload()
            });
            if (this.isUpdateMode) {
                this.toast('Success', 'Case updated.', 'success');
                getRecordNotifyChange([{ recordId: caseId }]);
                try {
                    this.dispatchEvent(new CloseActionScreenEvent());
                } catch (closeError) {
                    console.warn('CloseActionScreenEvent is not supported in this context.', closeError);
                }
            } else {
                this.toast('Success', 'Case successfully saved!', 'success');
                await this.openCaseRecord(caseId);
            }
            this.notifyFlowCompletion(caseId);
            this.resetWizardState();
        } catch (err) {
            const message = err?.body?.message || err?.message || 'Unexpected error';
            this.toast('Error', message, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    handleEditFromReview(event) {
        const step = event.detail?.step;
        if (!step) return;
        this.mode = 'intake';
        this.currentStep = step;
        this.stepStatus[step] = 'active';
        this.reviewSummaryReady = false;
    }

    normalizeServerForm(serverData = {}) {
        const normalized = createEmptyForm();
        normalized.basics = { ...(serverData.basics || {}) };
        normalized.presenting = { ...(serverData.presenting || {}) };
        normalized.priorDx = { ...(serverData.priorDx || {}) };
        normalized.suicide = { ...(serverData.suicide || {}) };
        normalized.violence = { ...(serverData.violence || {}) };
        normalized.psychosisMania = { ...(serverData.psychosisMania || {}) };
        normalized.familyTrauma = { ...(serverData.familyTrauma || {}) };
        normalized.medicalFlags = { ...(serverData.medicalFlags || {}) };
        normalized.homeSafety = { ...(serverData.homeSafety || {}) };
        normalized.cognition = { ...(serverData.cognition || {}) };
        normalized.supports = { ...(serverData.supports || {}) };
        normalized.screeners = Array.isArray(serverData.screeners)
            ? serverData.screeners.map(entry => this.hydrateScreener(entry))
            : [];
        normalized.medications = Array.isArray(serverData.medications)
            ? serverData.medications.map(entry => this.hydrateMedication(entry))
            : [];
        normalized.substances = Array.isArray(serverData.substances)
            ? serverData.substances.map(entry => this.hydrateSubstance(entry))
            : [];
        normalized.concerns = Array.isArray(serverData.concerns)
            ? serverData.concerns.map(entry => this.hydrateConcern(entry))
            : [];
        normalized.safetyRisks = Array.isArray(serverData.safetyRisks)
            ? serverData.safetyRisks.map(entry => this.hydrateSafetyRisk(entry))
            : [];
        return normalized;
    }
    /* ------------------------------------------------------------
        MERGE FORM STATE
    ------------------------------------------------------------ */
    mergeFormData(stepData) {
        const key = this
            .getStepFormKey(
                this.currentStep);
        if (!key) return;
        if (Array.isArray(stepData)) {
            if (key === 'medications') {
                this.form[key] = stepData.map(entry => this.hydrateMedication(entry));
            } else if (key === 'substances') {
                this.form[key] = stepData.map(entry => this.hydrateSubstance(entry));
            } else if (key === 'screeners') {
                this.form[key] = stepData.map(entry => this.hydrateScreener(entry));
            } else if (key === 'concerns') {
                this.form[key] = stepData.map(entry => this.hydrateConcern(entry));
            } else if (key === 'safetyRisks') {
                this.form[key] = stepData.map(entry => this.hydrateSafetyRisk(entry));
            } else {
                this.form[key] = [...stepData];
            }
        } else if (typeof stepData === 'object' && stepData !== null) {
            const next = { ...(this.form[key] || {}) };
            Object.keys(stepData).forEach(field => {
                const value = stepData[field];
                const isDraftField = field.endsWith('Draft');
                if (isDraftField || this.currentStep >= 4) {
                    next[field] = value;
                } else if (field.endsWith('__c') && this.currentStep < 4 && this.caseId) {
                    // avoid overwriting Case fields for earlier steps before Case is created
                    next[field] = value;
                } else {
                    next[field] = value;
                }
            });
            this.form[key] = next;
        }
    }
    // NOTA: Se ha corregido el mapeo para que concuerde con la definición de steps.
    getStepFormKey(step) {
        return {
            1: 'basics',
            2: 'presenting',
            3: 'priorDx',
            4: 'suicide',
            5: 'violence',
            6: 'psychosisMania',
            7: 'familyTrauma', 
            8: 'homeSafety',
            9: 'cognition',
            10: 'medications',
            11: 'substances',
            12: 'screeners',
            13: 'concerns',
            14: 'safetyRisks',
            15: 'review'
        } [step];
    }

    /* ------------------------------------------------------------
        RELATED RECORD PAYLOAD BUILDERS
    ------------------------------------------------------------ */
    buildMedicationPayload() {
        const meds = Array.isArray(this.form.medications) ? this.form.medications : [];
        const payload = meds
            .map(entry => this.hydrateMedication(entry))
            .map(med => {
                const meta = MEDICATION_INDEX[med.id] || {};
                const catalogName = med.catalogName || meta.title || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    id: med.id || null,
                    catalogName,
                    catalogCategory: med.catalogCategory || meta.category || '',
                    action: med.action || null,
                    frequency: med.frequency || null,
                    amount: med.amount || null,
                    unit: med.unit || null,
                    current: med.current === undefined ? null : med.current,
                    allergy: med.allergy === undefined ? null : med.allergy,
                    notes: med.notes || null
                };
            })
            .filter(Boolean);
        return payload;
    }

    buildSubstancePayload() {
        const subs = Array.isArray(this.form.substances) ? this.form.substances : [];
        return subs
            .map(entry => this.hydrateSubstance(entry))
            .map(sub => {
                const catalogName = sub.catalogName || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogName,
                    catalogCategory: sub.catalogCategory || '',
                    frequency: sub.frequency || null,
                    current: sub.current === undefined ? null : sub.current,
                    notes: sub.notes || null
                };
            })
            .filter(Boolean);
    }

    buildScreenerPayload() {
        const screeners = Array.isArray(this.form.screeners) ? this.form.screeners : [];
        return screeners
            .map(entry => this.hydrateScreener(entry))
            .map(scr => {
                const catalogName = scr.catalogName || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogName,
                    catalogType: scr.catalogType || '',
                    screenedDate: scr.date || null,
                    score: scr.score || null,
                    positive: scr.positive === undefined ? null : scr.positive,
                    notes: scr.notes || null
                };
            })
            .filter(Boolean);
    }

    buildConcernPayload() {
        const concerns = Array.isArray(this.form.concerns) ? this.form.concerns : [];
        return concerns
            .map(entry => this.hydrateConcern(entry))
            .map(item => {
                const label = item.label || '';
                if (!label) {
                    return null;
                }
                return {
                    label,
                    category: item.category || '',
                    notes: item.notes || null
                };
            })
            .filter(Boolean);
    }

    buildSafetyRiskPayload() {
        const risksSource = Array.isArray(this.form.safetyRisks)
             ? this.form.safetyRisks : [];
        return risksSource
            .map(entry => this.hydrateSafetyRisk(entry))
            .map(risk => {
                const catalogName = risk.catalogName || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogName,
                    catalogCategory: risk.catalogCategory || '',
                    recent: risk.recent === undefined ? null : risk.recent,
                    historical: risk.historical === undefined ? null : risk.historical,
                    notes: risk.notes || null
                };
            })
            .filter(Boolean);
    }

    async persistRelatedCollections(step) {
        if (!this.caseId) {
            return;
        }
        try {
            if (step === 10) {
                const medPayload = JSON.parse(JSON.stringify(this.buildMedicationPayload()));
                console.warn('💾 APEX saveMedications payload:', medPayload);
                await saveMedications({
                    caseId: this.caseId,
                    items: medPayload
                });
            } else if (step === 11) {
                const subPayload = JSON.parse(JSON.stringify(this.buildSubstancePayload()));
                await saveSubstances({
                    caseId: this.caseId,
                    items: subPayload
                });
            } else if (step === 12) {
                const scrPayload = JSON.parse(JSON.stringify(this.buildScreenerPayload()));
                await saveScreeners({
                    caseId: this.caseId,
                    items: scrPayload
                });
            } else if (step === 13) {
                const concernPayload = JSON.parse(JSON.stringify(this.buildConcernPayload()));
                await saveConcerns({
                    caseId: this.caseId,
                    items: concernPayload
                });
            } else if (step === 14) {
                const riskPayload = JSON.parse(JSON.stringify(this.buildSafetyRiskPayload()));
                await saveSafetyRisks({
                    caseId: this.caseId,
                    items: riskPayload
                });
            }
        } catch (error) {
            throw error;
        }
    }

    async persistAllCollections() {
        if (!this.caseId) {
            return;
        }
        try {
            const medPayload = JSON.parse(JSON.stringify(this.buildMedicationPayload()));
            await saveMedications({
                caseId: this.caseId,
                items: medPayload
            });
            const subPayload = JSON.parse(JSON.stringify(this.buildSubstancePayload()));
            await saveSubstances({
                caseId: this.caseId,
                items: subPayload
            });
            const scrPayload = JSON.parse(JSON.stringify(this.buildScreenerPayload()));
            await saveScreeners({
                caseId: this.caseId,
                items: scrPayload
            });
            const concernPayload = JSON.parse(JSON.stringify(this.buildConcernPayload()));
            await saveConcerns({
                caseId: this.caseId,
                items: concernPayload
            });
            const riskPayload = JSON.parse(JSON.stringify(this.buildSafetyRiskPayload()));
            await saveSafetyRisks({
                caseId: this.caseId,
                items: riskPayload
            });
        } catch (error) {
            throw error;
        }
    }

    /* ------------------------------------------------------------
        TOAST HELPER
    ------------------------------------------------------------ */
    toast(title, msg, variant) {
        const allowedVariants = new Set(['info', 'success', 'warning', 'error']);
        const normalized = (variant || '').toString().trim().toLowerCase();
        const safeVariant = allowedVariants.has(normalized) ? normalized : 'info';

        if (safeVariant !== normalized) {
            console.warn(`⚠️ Toast variant "${variant}" is invalid. Falling back to "${safeVariant}".`);
        }

        if (safeVariant === 'error') {
            this.inlineMessage = {
                title: title || 'Error',
                message: msg
            };
            return;
        }

        this.inlineMessage = null;

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message: msg,
                variant: safeVariant
            }));
    }

    hydrateMedication(entry = {}) {
        const derivedId = entry.id || entry.catalogId || this.lookupMedicationId(entry.catalogName);
        const meta = MEDICATION_INDEX[derivedId] || {};
        return {
            ...entry,
            id: derivedId || null,
            catalogId: entry.catalogId || null,
            catalogName: entry.catalogName || meta.title || '',
            catalogCategory: entry.catalogCategory || meta.category || '',
            action: entry.action || '',
            frequency: entry.frequency || '',
            amount: entry.amount || '',
            unit: entry.unit || '',
            current: entry.current === undefined ? null : entry.current,
            allergy: entry.allergy === undefined ? null : entry.allergy,
            notes: entry.notes || ''
        };
    }

    hydrateSubstance(entry = {}) {
        const derivedId = entry.id || this.lookupSubstanceId(entry.catalogName);
        const meta = SUBSTANCE_INDEX[derivedId] || {};
        return {
            ...entry,
            id: derivedId || entry.id || null,
            catalogName: entry.catalogName || meta.name || '',
            catalogCategory: entry.catalogCategory || meta.category || '',
            frequency: entry.frequency || '',
            current: entry.current === undefined ? null : entry.current,
            notes: entry.notes || ''
        };
    }

    hydrateScreener(entry = {}) {
        const derivedId = entry.id || this.lookupScreenerId(entry.catalogName);
        const meta = SCREENER_INDEX[derivedId] || {};
        return {
            ...entry,
            id: derivedId || entry.id || null,
            catalogName: entry.catalogName || meta.name || '',
            catalogType: entry.catalogType || meta.type || '',
            date: entry.date || '',
            score: entry.score || '',
            positive: entry.positive === undefined ? null : entry.positive,
            notes: entry.notes || ''
        };
    }

    hydrateConcern(entry = {}) {
        const label = entry.label || entry.name || '';
        const derivedId = entry.id || this.slugify(label);
        return {
            ...entry,
            id: derivedId || entry.id || label || null,
            label,
            category: entry.category || '',
            notes: entry.notes || ''
        };
    }

    hydrateSafetyRisk(entry = {}) {
        const derivedId = entry.id || this.lookupSafetyRiskId(entry.catalogName);
        const meta = SAFETY_RISK_INDEX[derivedId] || {};
        return {
            ...entry,
            id: derivedId || entry.id || null,
            catalogName: entry.catalogName || meta.name || '',
            catalogCategory: entry.catalogCategory || meta.category || '',
            recent: entry.recent === undefined ? null : entry.recent,
            historical: entry.historical === undefined ? null : entry.historical,
            notes: entry.notes || ''
        };
    }

    lookupMedicationId(name) {
        return this.lookupCatalogId(MEDICATION_NAME_TO_ID, name);
    }

    lookupSubstanceId(name) {
        return this.lookupCatalogId(SUBSTANCE_NAME_TO_ID, name);
    }

    lookupScreenerId(name) {
        return this.lookupCatalogId(SCREENER_NAME_TO_ID, name);
    }

    lookupSafetyRiskId(name) {
        return this.lookupCatalogId(SAFETY_RISK_NAME_TO_ID, name);
    }

    lookupCatalogId(index, label) {
        if (!label) {
            return null;
        }
        const key = label.toString().trim().toLowerCase();
        return index[key] || null;
    }

    slugify(value = '') {
        return value
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    isObjectPayload(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    resetWizardState() {
        this.mode = 'intake';
        this.currentStep = 1;
        this.caseId = null;
        this.form = createEmptyForm();
        this.validationResults = {};
        this.stepStatus = createInitialStepStatus();
        this.collectionModes = createInitialCollectionModes();
        this.inlineMessage = null;
        this.reviewSummaryReady = false;
        this.isSaving = false;
        localStorage.removeItem('gpCaseForm');
        this.stepsReady = true;
        this.formLoadedFromServer = false;
        this.initializingCaseContext = false;
    }

    prepareCaseSeed(seed = {}) {
        const payload = { ...(seed || {}) };
        if (this.providerId && !payload.Provider__c) {
            payload.Provider__c = this.providerId;
        }
        if (this.practiceAccountId && !payload.AccountId) {
            payload.AccountId = this.practiceAccountId;
        }
        if (this.patientContactId && !payload.ContactId) {
            payload.ContactId = this.patientContactId;
        }
        return payload;
    }

    async openCaseRecord(caseId) {
        if (!caseId) {
            return;
        }
        try {
            await this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: caseId,
                    objectApiName: 'Case',
                    actionName: 'view'
                }
            });
        } catch (navError) {
            console.warn('Navigation to case record failed', navError);
        }
    }

    notifyFlowCompletion(caseId) {
        this.dispatchEvent(new CustomEvent('casecomplete', {
            detail: { caseId }
        }));
        if (Array.isArray(this.availableActions) && this.availableActions.includes('FINISH')) {
            this.dispatchEvent(new FlowNavigationFinishEvent());
        }
    }

    handleCollectionModeChange(event) {
        const { step, mode } = event.detail || {};
        if (!step || !mode) {
            return;
        }
        if (this.collectionModes[step] === mode) {
            return;
        }
        this.collectionModes = {
            ...this.collectionModes,
            [step]: mode
        };
    }
}