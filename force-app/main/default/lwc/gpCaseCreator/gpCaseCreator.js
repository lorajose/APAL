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
import getCaseFullDataFresh from '@salesforce/apex/GPCaseService.getCaseFullDataFresh';
import getPcqtSelections from '@salesforce/apex/PCQTSelectorController.getPcqtSelections';
import savePcqtSelections from '@salesforce/apex/PCQTSelectorController.savePcqtSelections';
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
import FORM_FACTOR from '@salesforce/client/formFactor';

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
const PSYCHOSOCIAL_STRESSORS = new Set([
    'housing insecurity',
    'food insecurity',
    'caregiver burden',
    'legal issues',
    'job/school risk',
    'relationship conflict',
    'limited supports',
    'financial stress'
]);
const FAMILY_HISTORY_ITEMS = new Set([
    'bipolar',
    'psychosis/schizophrenia',
    'suicide',
    'sud',
    'depression/anxiety',
    'none',
    'unknown'
]);
const PRIOR_DIAGNOSES_ITEMS = new Set([
    'mdd',
    'bipolar i',
    'bipolar ii',
    'gad',
    'panic disorder',
    'ptsd',
    'psychotic disorder',
    'adhd',
    'ocd',
    'sud',
    'personality disorder',
    'eating disorder',
    'other'
]);
const TOP_SYMPTOMS_ITEMS = new Set([
    'depressed mood',
    'anhedonia',
    'anxiety',
    'panic',
    'insomnia',
    'hypersomnia',
    'appetite change',
    'low energy',
    'poor concentration'
]);
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
    forceErrorHighlight = false;
    _persistingSteps = new Set();
    _pendingPersistSteps = new Set();
    // Almacena los resultados de la validación de todos los pasos: { 1: { isValid, hardErrors, softWarnings }, ... }
    @track validationResults = {};
    @track showStepErrors = {};
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
        label: 'Concerns',
        value: 13
    }, {
        label: 'Safety Risks',
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
        if (!this.showStepErrors[this.currentStep]) {
            return {};
        }
        const result = this.validationResults[this.currentStep];
        if (!result || !result.hardErrors) {
            return {};
        }
        return result.hardErrors.reduce((acc, error) => {
            acc[error.path] = error.message;
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
        if ([10, 11, 12, 13, 14].includes(this.currentStep)) {
            try {
                const counts = {
                    meds: Array.isArray(this.form.medications) ? this.form.medications.length : 0,
                    subs: Array.isArray(this.form.substances) ? this.form.substances.length : 0,
                    scr: Array.isArray(this.form.screeners) ? this.form.screeners.length : 0,
                    con: Array.isArray(this.form.concerns) ? this.form.concerns.length : 0,
                    risk: Array.isArray(this.form.safetyRisks) ? this.form.safetyRisks.length : 0
                };
                console.warn(`[GPCaseCreator:currentStepData] step=${this.currentStep} key=${key}`, counts);
            } catch (logErr) {
                // eslint-disable-next-line no-console
                console.error('currentStepData log error', logErr);
            }
        }
        return this.form[key] || {};
    }
    get isUpdateMode() {
        return this.formLoadedFromServer;
    }

    get isPhone() {
        return FORM_FACTOR === 'Small';
    }

    get isTablet() {
        return FORM_FACTOR === 'Medium';
    }

    get isDesktop() {
        return FORM_FACTOR === 'Large';
    }

    get wizardLayoutClass() {
        if (this.isPhone) return 'wizard-layout form-factor-small';
        if (this.isTablet) return 'wizard-layout form-factor-medium';
        return 'wizard-layout form-factor-large';
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
        const guidedCopy = 'Click Add Screeners -> Add record -> Add details -> Review -> Save';  
        const guidedCopyM = 'Click Add Medications -> Add record -> Add details -> Review -> Save';
        const guidedCopyS = 'Click Add Substances -> Add record -> Add details -> Review -> Save';
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
                    ? guidedCopyM
                    : 'Click Add Medications -> Add record -> Add details -> Review -> Save';
            case 11:
                return this.collectionModes[11] === 'wizard'
                    ? guidedCopyS
                    : 'Click Add Substances -> Add record -> Add details -> Review -> Save';
            case 12:
                return this.collectionModes[12] === 'wizard'
                    ? guidedCopy
                    : 'Click Add Screeners -> Add record -> Add details -> Review -> Save';                                
            case 13:
                return 'Click Add Concerns -> Add record -> Add details -> Review -> Save';
            case 14:
                return 'Click Add Safety Risks -> Add record -> Add details -> Review -> Save';
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
        // Si falló la validación HARD (amarillo por defecto, rojo si viene de Finish/Update)
        else if (!result.isValid) {
            this.stepStatus[step] = this.forceErrorHighlight ? 'in-progress' : 'warning';
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
        const isCurrent = s.value === this.currentStep;

        if (isCurrent) {
            css += "step-active";
        } else if (status === 'active') {
            // Si no es el paso actual, no mantenerlo en activo; mostrar como completado
            css += "step-completed";
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
        // eslint-disable-next-line no-console
        console.error("🔥 FORM BASICS LOADED:", JSON.stringify(this.form.basics));
        this.logCollectionState('connected:start');
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
        this.logCollectionState('connected:end');
        // eslint-disable-next-line no-console
        console.error('[GPCaseCreator] connectedCallback complete', { recordId: this.recordId, caseId: this.caseId, formLoadedFromServer: this.formLoadedFromServer });
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
                await this.refreshRecordBeforeLoad();
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

    async refreshRecordBeforeLoad() {
        const ids = new Set();
        if (this.recordId) ids.add(this.recordId);
        if (this.caseId) ids.add(this.caseId);
        if (ids.size === 0) return;
        try {
            getRecordNotifyChange(Array.from(ids).map(recordId => ({ recordId })));
        } catch (e) {
            // ignore notify issues
        }
        // Allow LDS to process before pulling fresh apex data.
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    logCollectionState(contextLabel = 'state') {
        try {
            const meds = Array.isArray(this.form.medications) ? this.form.medications.length : 0;
            const subs = Array.isArray(this.form.substances) ? this.form.substances.length : 0;
            const scr = Array.isArray(this.form.screeners) ? this.form.screeners.length : 0;
            const con = Array.isArray(this.form.concerns) ? this.form.concerns.length : 0;
            const risk = Array.isArray(this.form.safetyRisks) ? this.form.safetyRisks.length : 0;
            console.warn(`[GPCaseCreator:${contextLabel}] recordId=${this.recordId} caseId=${this.caseId} loadedFromServer=${this.formLoadedFromServer}`, {
                meds,
                subs,
                screeners: scr,
                concerns: con,
                safetyRisks: risk
            });
        } catch (logError) {
            // eslint-disable-next-line no-console
            console.error('LogCollectionState error', logError);
        }
    }

    async loadFullCaseData() {
        if (!this.caseId) {
            this.formLoadedFromServer = false;
            return false;
        }
        try {
            const fetchCaseData = this.recordId ? getCaseFullDataFresh : getCaseFullData;
            const serverData = await fetchCaseData({
                caseId: this.caseId
            });
            if (serverData) {
                try {
                    const meds = Array.isArray(serverData.medications) ? serverData.medications.length : 0;
                    const subs = Array.isArray(serverData.substances) ? serverData.substances.length : 0;
                    const scr = Array.isArray(serverData.screeners) ? serverData.screeners.length : 0;
                    const con = Array.isArray(serverData.concerns) ? serverData.concerns.length : 0;
                    const risk = Array.isArray(serverData.safetyRisks) ? serverData.safetyRisks.length : 0;
                    // eslint-disable-next-line no-console
                    console.error(`[GPCaseCreator:loadFullCaseData] recordId=${this.recordId} caseId=${this.caseId} meds=${meds} subs=${subs} scr=${scr} con=${con} risk=${risk}`);
                } catch (logErr) {
                    // eslint-disable-next-line no-console
                    console.error('loadFullCaseData log error', logErr);
                }
                this.form = this.normalizeServerForm(serverData);
                // Cargar selecciones PCQT (ids) para que el selector y las chips las muestren al editar
                try {
                    const pcqtIds = await getPcqtSelections({ recordId: this.caseId });
                    if (Array.isArray(pcqtIds) && pcqtIds.length) {
                        const presenting = { ...(this.form.presenting || {}) };
                        presenting.primaryClinicalQuestionTypesDraft = [...pcqtIds];
                        this.form.presenting = presenting;
                    }
                } catch (pcqtErr) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to load PCQT selections', pcqtErr);
                }
                // Seed Top Symptoms into concerns on initial load if present
                if (Array.isArray(this.form?.presenting?.topSymptomsDraft)) {
                    this.syncTopSymptomsToConcerns(this.form.presenting.topSymptomsDraft);
                }
                // Seed Prior Diagnoses into concerns on initial load if present
                if (Array.isArray(this.form?.priorDx?.priorDiagnosesDraft)) {
                    this.syncPriorDxToConcerns(this.form.priorDx.priorDiagnosesDraft);
                }
                // Seed Psychosis/Mania/Red Flags into concerns on initial load if present
                if (this.form?.psychosisMania) {
                    this.syncPsychosisManiaToConcerns(this.form.psychosisMania);
                }
                // Seed Family History into concerns on initial load if present
                if (Array.isArray(this.form?.familyTrauma?.familyHistoryDraft)) {
                    this.syncFamilyHistoryToConcerns(this.form.familyTrauma.familyHistoryDraft);
                }
                // Seed Psychological Stressors into safety risks on initial load if present
                if (Array.isArray(this.form?.homeSafety?.psychosocialStressorsDraft)) {
                    this.syncStressorsToSafetyRisks(this.form.homeSafety.psychosocialStressorsDraft);
                }
                if (Array.isArray(this.form?.safetyRisks)) {
                    this.syncSafetyRisksToStressors(this.form.safetyRisks);
                }
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
    const data = event.detail || {};
    try {
        const debugPayload = {
            step: this.currentStep,
            meds: Array.isArray(data) && this.currentStep === 10 ? data.length : (Array.isArray(this.form.medications) ? this.form.medications.length : 0),
            subs: Array.isArray(data) && this.currentStep === 11 ? data.length : (Array.isArray(this.form.substances) ? this.form.substances.length : 0),
            scr: Array.isArray(data) && this.currentStep === 12 ? data.length : (Array.isArray(this.form.screeners) ? this.form.screeners.length : 0),
            con: Array.isArray(data) && this.currentStep === 13 ? data.length : (Array.isArray(this.form.concerns) ? this.form.concerns.length : 0),
            risk: Array.isArray(data) && this.currentStep === 14 ? data.length : (Array.isArray(this.form.safetyRisks) ? this.form.safetyRisks.length : 0)
        };
        // eslint-disable-next-line no-console
        console.error('🔥 PARENT RECEIVED', debugPayload);
    } catch (debugErr) {
        // eslint-disable-next-line no-console
        console.error('Debug payload error', debugErr);
    }

    this.mergeFormData(data);
    // eslint-disable-next-line no-console
    console.error("🔥 FORM AFTER BASICS:", JSON.stringify(this.form.basics));

    // Seed Top Symptoms → Concerns (Step 2)
    if (this.currentStep === 2 && Array.isArray(data.topSymptomsDraft)) {
        const seeded = this.syncTopSymptomsToConcerns(data.topSymptomsDraft);
        if (seeded && this.caseId) {
            try {
                await this.persistRelatedCollections(13);
            } catch (seedErr) {
                // eslint-disable-next-line no-console
                console.error('Error persisting seeded concerns', seedErr);
            }
        }
    }
    // Seed Prior Diagnoses → Concerns (Step 3)
    if (this.currentStep === 3 && Array.isArray(data.priorDiagnosesDraft)) {
        const seededPrior = this.syncPriorDxToConcerns(data.priorDiagnosesDraft);
        if (seededPrior && this.caseId) {
            try {
                await this.persistRelatedCollections(13);
            } catch (seedErr) {
                // eslint-disable-next-line no-console
                console.error('Error persisting seeded prior dx concerns', seedErr);
            }
        }
    }
    // Seed Psychosis/Mania/Red Flags → Concerns (Step 6)
    if (this.currentStep === 6 && data) {
        const seededPsychosis = this.syncPsychosisManiaToConcerns(data);
        if (seededPsychosis && this.caseId) {
            try {
                await this.persistRelatedCollections(13);
            } catch (seedErr) {
                // eslint-disable-next-line no-console
                console.error('Error persisting seeded psychosis/mania concerns', seedErr);
            }
        }
    }
    // Seed Family History → Concerns (Step 7)
    if (this.currentStep === 7 && Array.isArray(data.familyHistoryDraft)) {
        const seededFamily = this.syncFamilyHistoryToConcerns(data.familyHistoryDraft);
        if (seededFamily && this.caseId) {
            try {
                await this.persistRelatedCollections(13);
            } catch (seedErr) {
                // eslint-disable-next-line no-console
                console.error('Error persisting seeded family history concerns', seedErr);
            }
        }
    }
    // Seed Psychological Stressors → Safety Risks (Step 8)
    if (this.currentStep === 8 && Array.isArray(data.psychosocialStressorsDraft)) {
        const seededStressors = this.syncStressorsToSafetyRisks(data.psychosocialStressorsDraft);
        if (seededStressors && this.caseId) {
            try {
                await this.persistRelatedCollections(14);
            } catch (seedErr) {
                // eslint-disable-next-line no-console
                console.error('Error persisting seeded safety risks', seedErr);
            }
        }
    }
    if (this.currentStep === 14) {
        const risks = Array.isArray(data) ? data : this.form.safetyRisks;
        if (Array.isArray(risks)) {
            this.syncSafetyRisksToStressors(risks);
        }
    }
    if (this.currentStep === 13 && Array.isArray(data)) {
        this.syncConcernsToFamilyHistory(data);
        this.syncConcernsToPriorDx(data);
        this.syncConcernsToTopSymptoms(data);
    }


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
        const currentStep = this.currentStep;
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
        }
        // 2. Saltar al nuevo paso y marcarlo como 'active'
        this.currentStep = step;
        this.stepStatus[step] = 'active';
        // 3. Actualiza el estado del paso que se deja (ya no es currentStep)
        if (this.validationResults[currentStep]) {
            this.updateStepStatus(currentStep);
        }
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
                this.showStepErrors = { ...this.showStepErrors, [currentStep]: true };
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
            if (!this.caseId && this.areRequiredCaseStepsValid()) {
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

    areRequiredCaseStepsValid() {
        const requiredSteps = [1, 2, 4, 5, 8, 9];
        return requiredSteps.every(step => validateStep(step, this.form).isValid);
    }
    /* ------------------------------------------------------------
        STEP 15 → FINISH (Final Validation)
    ------------------------------------------------------------ */
    async handleFinish() {
        if (this.isSaving) {
            return;
        }
        this.forceErrorHighlight = true;
        // Ejecutar validación final para todos los pasos
        this.runFullValidation(true);
        const allStepsValid = Object
            .values(this
                .validationResults)
            .every(res => res
                .isValid);
        if (allStepsValid) {
            this.forceErrorHighlight = false;
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
        if (this.isSaving) {
            return;
        }
        this.forceErrorHighlight = true;
        this.runFullValidation(true);
        const allStepsValid = Object.values(this.validationResults).every(res => res.isValid);
        if (!allStepsValid) {
            this.reviewSummaryReady = false;
            this.toast('Error', 'The process cannot be completed. Please review the steps marked with an error.', 'error');
            this.navigateToFirstInvalidStep();
            return;
        }

        if (!this.caseId) {
            if (!this.areRequiredCaseStepsValid()) {
                this.toast('Error', 'Complete all required fields in Steps 1, 2, 4, 5, 8, and 9 before saving the case.', 'error');
                return;
            }
            const seedPayload = this.prepareCaseSeed({ ...(this.form.basics || {}) });
            if (!seedPayload || !seedPayload.Subject) {
                this.toast('Error', 'Unable to save related data because the Case has not been created yet.', 'error');
                return;
            }
            this.caseId = await createCase({ stepData: seedPayload });
            await saveStepData({
                caseId: this.caseId,
                stepData: this.form.basics || {}
            });
        }

        this.isSaving = true;
        try {
            const caseId = this.caseId;

            // Persist core steps (1-9) in update mode to capture edits before final save
            const coreSteps = [
                this.form.basics || {},
                this.form.presenting || {},
                this.form.priorDx || {},
                this.form.suicide || {},
                this.form.violence || {},
                this.form.psychosisMania || {},
                this.form.familyTrauma || {},
                this.form.homeSafety || {},
                this.form.cognition || {}
            ];
            for (const stepData of coreSteps) {
                await saveStepData({ caseId, stepData });
            }

            const pcqtIds = this.getPcqtSelectionIds();
            await savePcqtSelections({
                recordId: caseId,
                selectionIds: pcqtIds
            });
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
                items: this.buildConcernPayload(),
                deleteMissing: true
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
                // For update flows, force a full page refresh to sync all open tabs
                this.reloadPage();
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

    reloadPage() {
        try {
            // eslint-disable-next-line no-restricted-globals
            window.location.reload();
        } catch (e) {
            // swallow reload issues
        }
    }

    get savingLabel() {
        return this.isUpdateMode ? 'Updating case' : 'Creating case';
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

    // Sync Top Symptoms from Step 2 into Concerns (category: Top symptoms)
    syncTopSymptomsToConcerns(topSymptomsDraft = []) {
        const existing = Array.isArray(this.form.concerns) ? this.form.concerns : [];
        const newTop = (topSymptomsDraft || [])
            .filter(item => item && item.value)
            .map(item => {
                const label = item.label || item.value;
                return {
                    id: item.value || this.slugify(label),
                    label,
                    category: 'Top symptoms',
                    notes: item.note || '',
                    source: 'presenting'
                };
            });
        const mappedLabels = new Set(newTop.map(entry => (entry.label || '').toLowerCase()).filter(Boolean));
        const nonSeeded = existing.filter(item => {
            const category = (item.category || '').toLowerCase();
            if (category !== 'top symptoms') {
                return true;
            }
            if ((item.source || '').toLowerCase() === 'presenting') {
                return false;
            }
            const labelKey = (item.label || item.name || '').toLowerCase();
            if (mappedLabels.has(labelKey)) {
                return false;
            }
            return true;
        });

        // Deduplicate by label (case-insensitive)
        const byLabel = new Map();
        newTop.forEach(entry => {
            const key = (entry.label || '').toLowerCase();
            if (!key) return;
            if (!byLabel.has(key)) {
                byLabel.set(key, entry);
            } else {
                const existingEntry = byLabel.get(key);
                if (!existingEntry.notes && entry.notes) {
                    existingEntry.notes = entry.notes;
                }
                byLabel.set(key, existingEntry);
            }
        });

        const merged = [...nonSeeded, ...byLabel.values()];
        const changed = JSON.stringify(merged) !== JSON.stringify(existing);
        if (changed) {
            this.form.concerns = merged;
        }
        return changed;
    }
    // Sync Psychological Stressors (Step 8) into Safety Risks (category: Psychological stressors)
    syncStressorsToSafetyRisks(stressorsDraft = []) {
        const existing = Array.isArray(this.form.safetyRisks) ? this.form.safetyRisks : [];
        const nonSeeded = existing.filter(item => item.catalogCategory !== 'Psychological stressors' || item.source !== 'stressors');

        const mapped = (stressorsDraft || [])
            .filter(item => item && item.value)
            .map(item => {
                const label = item.label || item.value;
                const catalogId = this.lookupSafetyRiskId(label);
                return {
                    id: catalogId || item.value || this.slugify(label),
                    catalogName: label,
                    catalogCategory: 'Psychological stressors',
                    recent: item.recent === undefined ? null : !!item.recent,
                    historical: item.historical === undefined ? null : !!item.historical,
                    notes: item.note || '',
                    source: 'stressors'
                };
            });

        // Deduplicate by label (case-insensitive)
        const byLabel = new Map();
        mapped.forEach(entry => {
            const key = (entry.catalogName || '').toLowerCase();
            if (!key) return;
            const existingEntry = byLabel.get(key);
            if (!existingEntry) {
                byLabel.set(key, entry);
            } else {
                // merge flags/notes if needed
                byLabel.set(key, {
                    ...existingEntry,
                    recent: entry.recent ?? existingEntry.recent,
                    historical: entry.historical ?? existingEntry.historical,
                    notes: entry.notes || existingEntry.notes
                });
            }
        });

        const merged = [...nonSeeded, ...byLabel.values()];
        const changed = JSON.stringify(merged) !== JSON.stringify(existing);
        if (changed) {
            this.form.safetyRisks = merged;
        }
        return changed;
    }

    syncSafetyRisksToStressors(risks = []) {
        const existing = this.form?.homeSafety?.psychosocialStressorsDraft || [];
        const existingByLabel = new Map();
        existing.forEach(item => {
            const key = (item.label || item.value || '').toString().toLowerCase();
            if (key) existingByLabel.set(key, item);
        });

        const mapped = (risks || [])
            .filter(item => {
                const idCandidate = item.catalogId || item.id;
                const localMeta = SAFETY_RISK_INDEX[idCandidate] || {};
                const category = (item.catalogCategory
                    || item.category
                    || item.meta?.category
                    || localMeta.category
                    || '').toLowerCase();
                const source = (item.source || item.Seed_Source__c || '').toString().toLowerCase();
                const name = (item.catalogName
                    || item.meta?.name
                    || item.recordName
                    || item.name
                    || localMeta.name
                    || item.label
                    || '').toString().toLowerCase();
                return category === 'psychological stressors'
                    || source === 'stressors'
                    || source === 'step8_psychologicalstressors'
                    || PSYCHOSOCIAL_STRESSORS.has(name);
            })
            .map(item => {
                const idCandidate = item.catalogId || item.id;
                const localMeta = SAFETY_RISK_INDEX[idCandidate] || {};
                const label = item.catalogName
                    || item.meta?.name
                    || item.recordName
                    || item.name
                    || localMeta.name
                    || item.label
                    || '';
                const key = label.toLowerCase();
                const existingItem = key ? existingByLabel.get(key) : null;
                return {
                    value: label || existingItem?.value,
                    label: label || existingItem?.label,
                    note: item.notes ?? existingItem?.note ?? '',
                    recent: item.recent === undefined ? (existingItem?.recent ?? false) : !!item.recent,
                    historical: item.historical === undefined ? (existingItem?.historical ?? false) : !!item.historical
                };
            })
            .filter(item => !!item.value);

        const changed = JSON.stringify(mapped) !== JSON.stringify(existing);
        if (changed) {
            this.form.homeSafety = {
                ...(this.form.homeSafety || {}),
                psychosocialStressorsDraft: mapped
            };
        }
        return changed;
    }

    syncConcernsToFamilyHistory(concerns = []) {
        const existing = this.form?.familyTrauma?.familyHistoryDraft || [];
        const existingByLabel = new Map();
        existing.forEach(item => {
            const key = (item.label || item.value || '').toString().toLowerCase();
            if (key) existingByLabel.set(key, item);
        });

        const mapped = (concerns || [])
            .filter(item => (item.category || '').toLowerCase() === 'family history')
            .map(item => {
                const label = (item.label || item.name || item.catalogName || '').toString();
                const key = label.toLowerCase();
                if (!FAMILY_HISTORY_ITEMS.has(key)) {
                    return null;
                }
                const existingItem = existingByLabel.get(key);
                return {
                    value: label || existingItem?.value,
                    label: label || existingItem?.label,
                    note: item.notes ?? existingItem?.note ?? ''
                };
            })
            .filter(Boolean);

        const changed = JSON.stringify(mapped) !== JSON.stringify(existing);
        if (changed) {
            this.form.familyTrauma = {
                ...(this.form.familyTrauma || {}),
                familyHistoryDraft: mapped
            };
        }
        return changed;
    }

    syncConcernsToPriorDx(concerns = []) {
        const existing = this.form?.priorDx?.priorDiagnosesDraft || [];
        const existingByLabel = new Map();
        existing.forEach(item => {
            const key = (item.label || item.value || '').toString().toLowerCase();
            if (key) existingByLabel.set(key, item);
        });

        const mapped = (concerns || [])
            .filter(item => (item.category || '').toLowerCase() === 'prior diagnosis')
            .map(item => {
                const label = (item.label || item.name || item.catalogName || '').toString();
                const key = label.toLowerCase();
                if (!PRIOR_DIAGNOSES_ITEMS.has(key)) {
                    return null;
                }
                const existingItem = existingByLabel.get(key);
                return {
                    value: label || existingItem?.value,
                    label: label || existingItem?.label,
                    note: item.notes ?? existingItem?.note ?? ''
                };
            })
            .filter(Boolean);

        const changed = JSON.stringify(mapped) !== JSON.stringify(existing);
        if (changed) {
            this.form.priorDx = {
                ...(this.form.priorDx || {}),
                priorDiagnosesDraft: mapped
            };
        }
        return changed;
    }

    syncConcernsToTopSymptoms(concerns = []) {
        const existing = this.form?.presenting?.topSymptomsDraft || [];
        const existingByLabel = new Map();
        existing.forEach(item => {
            const key = (item.label || item.value || '').toString().toLowerCase();
            if (key) existingByLabel.set(key, item);
        });

        const mapped = (concerns || [])
            .filter(item => (item.category || '').toLowerCase() === 'top symptoms')
            .map(item => {
                const label = (item.label || item.name || item.catalogName || '').toString();
                const key = label.toLowerCase();
                if (!TOP_SYMPTOMS_ITEMS.has(key)) {
                    return null;
                }
                const existingItem = existingByLabel.get(key);
                return {
                    value: label || existingItem?.value,
                    label: label || existingItem?.label,
                    note: item.notes ?? existingItem?.note ?? ''
                };
            })
            .filter(Boolean);

        const changed = JSON.stringify(mapped) !== JSON.stringify(existing);
        if (changed) {
            this.form.presenting = {
                ...(this.form.presenting || {}),
                topSymptomsDraft: mapped
            };
        }
        return changed;
    }
    // Sync Prior Diagnoses from Step 3 into Concerns (category: Prior diagnosis)
    syncPriorDxToConcerns(priorDiagnosesDraft = []) {
        const existing = Array.isArray(this.form.concerns) ? this.form.concerns : [];
        const mapped = (priorDiagnosesDraft || [])
            .filter(item => item && item.value)
            .map(item => {
                const label = item.label || item.value;
                return {
                    id: item.value || this.slugify(label),
                    label,
                    category: 'Prior diagnosis',
                    notes: item.note || '',
                    source: 'priorDx'
                };
            });
        const mappedLabels = new Set(mapped.map(entry => (entry.label || '').toLowerCase()).filter(Boolean));
        const nonSeeded = existing.filter(item => {
            const category = (item.category || '').toLowerCase();
            if (category !== 'prior diagnosis') {
                return true;
            }
            if ((item.source || '').toLowerCase() === 'priordx') {
                return false;
            }
            const labelKey = (item.label || item.name || '').toLowerCase();
            if (mappedLabels.has(labelKey)) {
                return false;
            }
            return true;
        });

        const byLabel = new Map();
        mapped.forEach(entry => {
            const key = (entry.label || '').toLowerCase();
            if (!key) return;
            if (!byLabel.has(key)) {
                byLabel.set(key, entry);
            } else {
                const existingEntry = byLabel.get(key);
                if (!existingEntry.notes && entry.notes) {
                    existingEntry.notes = entry.notes;
                }
                byLabel.set(key, existingEntry);
            }
        });

        const merged = [...nonSeeded, ...byLabel.values()];
        const changed = JSON.stringify(merged) !== JSON.stringify(existing);
        if (changed) {
            this.form.concerns = merged;
        }
        return changed;
    }
    // Sync Psychosis/Mania/Medical Red Flags (Step 6) into Concerns with shared notes
    syncPsychosisManiaToConcerns(data = {}) {
        const existing = Array.isArray(this.form.concerns) ? this.form.concerns : [];
        const isSeededItem = (item) => {
            const seededCategories = ['Psychosis symptoms', 'Mania / Hypomania symptoms', 'Medical red flags'];
            return seededCategories.includes(item.category) && item.source === 'psychosisMania';
        };
        const nonSeeded = existing.filter(item => !isSeededItem(item));

        const psychosisList = Array.isArray(data.psychosisSymptomsDraft) ? data.psychosisSymptomsDraft : [];
        const maniaList = Array.isArray(data.maniaSymptomsDraft) ? data.maniaSymptomsDraft : [];
        const redFlagList = Array.isArray(data.medicalRedFlagsDraft) ? data.medicalRedFlagsDraft : [];

        const sharedPsychosisNote = data.Psychosis_Notes__c || '';
        const sharedRedFlagNote = data.Red_Flag_Notes__c || data.Medical_Notes__c || '';

        const buildEntries = (list, category, note) => {
            return (list || [])
                .filter(val => !!val)
                .map(val => {
                    const label = val;
                    return {
                        id: val || this.slugify(label),
                        label,
                        category,
                        notes: note || '',
                        source: 'psychosisMania'
                    };
                });
        };

        const psychosisEntries = buildEntries(psychosisList, 'Psychosis symptoms', sharedPsychosisNote);
        const maniaEntries = buildEntries(maniaList, 'Mania / Hypomania symptoms', sharedPsychosisNote);
        const redFlagEntries = buildEntries(redFlagList, 'Medical red flags', sharedRedFlagNote);

        // Deduplicate by category + label (case-insensitive)
        const byKey = new Map();
        [...psychosisEntries, ...maniaEntries, ...redFlagEntries].forEach(entry => {
            const key = `${entry.category.toLowerCase()}::${(entry.label || '').toLowerCase()}`;
            if (!key) return;
            const existingEntry = byKey.get(key);
            if (!existingEntry) {
                byKey.set(key, entry);
            } else if (!existingEntry.notes && entry.notes) {
                byKey.set(key, { ...existingEntry, notes: entry.notes });
            }
        });

        const merged = [...nonSeeded, ...byKey.values()];
        const changed = JSON.stringify(merged) !== JSON.stringify(existing);
        if (changed) {
            this.form.concerns = merged;
        }
        return changed;
    }
    // Sync Family History (Step 7) into Concerns (category: Family history)
    syncFamilyHistoryToConcerns(familyHistoryDraft = []) {
        const categoryLabel = 'Family History';
        const existing = Array.isArray(this.form.concerns) ? this.form.concerns : [];

        const mapped = (familyHistoryDraft || [])
            .filter(item => item && item.value)
            .map(item => {
                const label = item.label || item.value;
                return {
                    id: item.value || this.slugify(label),
                    label,
                    category: categoryLabel,
                    notes: item.note || '',
                    source: 'familyHistory'
                };
            });
        const mappedLabels = new Set(mapped.map(entry => (entry.label || '').toLowerCase()).filter(Boolean));
        const nonSeeded = existing.filter(item => {
            const category = (item.category || '').toLowerCase();
            if (category !== 'family history') {
                return true;
            }
            if ((item.source || '').toLowerCase() === 'familyhistory') {
                return false;
            }
            const labelKey = (item.label || item.name || '').toLowerCase();
            if (mappedLabels.has(labelKey)) {
                return false;
            }
            return true;
        });

        const byLabel = new Map();
        mapped.forEach(entry => {
            const key = (entry.label || '').toLowerCase();
            if (!key) return;
            if (!byLabel.has(key)) {
                byLabel.set(key, entry);
            } else {
                const existingEntry = byLabel.get(key);
                if (!existingEntry.notes && entry.notes) {
                    byLabel.set(key, { ...existingEntry, notes: entry.notes });
                }
            }
        });

        const merged = [...nonSeeded, ...byLabel.values()];
        const changed = JSON.stringify(merged) !== JSON.stringify(existing);
        if (changed) {
            this.form.concerns = merged;
        }
        return changed;
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
        const looksLikeId = (value) => {
            if (!value || typeof value !== 'string') return false;
            const trimmed = value.trim();
            if (trimmed.length !== 15 && trimmed.length !== 18) return false;
            return /^[a-zA-Z0-9]+$/.test(trimmed);
        };
        const mapped = concerns
            .map(entry => this.hydrateConcern(entry))
            .map(item => {
                const label = item.label || '';
                if (!label) {
                    return null;
                }
                return {
                    catalogId: looksLikeId(item.catalogId)
                        ? item.catalogId
                        : (looksLikeId(item.id) ? item.id : null),
                    label,
                    category: item.category || '',
                    notes: item.notes || null,
                    source: this.mapConcernSeedSource(item)
                };
            })
            .filter(Boolean);
        const byKey = new Map();
        mapped.forEach(item => {
            const key = item.catalogId || item.label.toLowerCase();
            if (!byKey.has(key)) {
                byKey.set(key, item);
            }
        });
        return Array.from(byKey.values());
    }

    buildSafetyRiskPayload() {
        const risksSource = Array.isArray(this.form.safetyRisks)
             ? this.form.safetyRisks : [];
        const looksLikeId = (value) => {
            if (!value || typeof value !== 'string') return false;
            const trimmed = value.trim();
            if (trimmed.length !== 15 && trimmed.length !== 18) return false;
            return /^[a-zA-Z0-9]+$/.test(trimmed);
        };
        return risksSource
            .map(entry => this.hydrateSafetyRisk(entry))
            .map(risk => {
                const catalogName = risk.catalogName || '';
                if (!catalogName) {
                    return null;
                }
                return {
                    catalogId: looksLikeId(risk.catalogId)
                        ? risk.catalogId
                        : (looksLikeId(risk.id) ? risk.id : null),
                    catalogName,
                    catalogCategory: risk.catalogCategory || '',
                    recent: risk.recent === undefined ? null : risk.recent,
                    historical: risk.historical === undefined ? null : risk.historical,
                    notes: risk.notes || null,
                    source: this.mapRiskSeedSource(risk)
                };
            })
            .filter(Boolean);
    }

    getPcqtSelectionIds() {
        const looksLikePcqtId = (val) => {
            if (typeof val !== 'string') return false;
            const trimmed = val.trim();
            if (trimmed.length !== 18 && trimmed.length !== 15) return false;
            return /^[a-zA-Z0-9]+$/.test(trimmed) && trimmed.toLowerCase().startsWith('a0');
        };
        const presenting = this.form?.presenting || {};
        if (Array.isArray(presenting.primaryClinicalQuestionTypesDraft)) {
            return presenting.primaryClinicalQuestionTypesDraft.filter(looksLikePcqtId);
        }
        const raw = presenting.Primary_Clinical_Question_Types__c;
        if (raw && typeof raw === 'string') {
            return raw
                .split(';')
                .map(v => v.trim())
                .filter(looksLikePcqtId);
        }
        return [];
    }

    async persistRelatedCollections(step) {
        if (!this.caseId) {
            return;
        }
        if (this._persistingSteps.has(step)) {
            this._pendingPersistSteps.add(step);
            return;
        }
        this._persistingSteps.add(step);
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
                    items: concernPayload,
                    deleteMissing: true
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
        } finally {
            this._persistingSteps.delete(step);
            if (this._pendingPersistSteps.has(step)) {
                this._pendingPersistSteps.delete(step);
                await this.persistRelatedCollections(step);
            }
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
                items: concernPayload,
                deleteMissing: true
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
            notes: entry.notes || '',
            source: entry.source || entry.Seed_Source__c || 'Manual'
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
            notes: entry.notes || '',
            source: entry.source || entry.Seed_Source__c || 'Manual'
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

    mapConcernSeedSource(item = {}) {
        const src = (item.source || '').trim();
        if (src) {
            switch (src) {
                case 'presenting':
                case 'Step2_TopSymptoms':
                    return 'Step2_TopSymptoms';
                case 'priorDx':
                case 'Step3_PriorDiagnosis':
                    return 'Step3_PriorDiagnosis';
                case 'psychosisMania':
                case 'Step6_PsychosisMania':
                    return 'Step6_PsychosisMania';
                case 'familyHistory':
                case 'Step7_FamilyHistory':
                    return 'Step7_FamilyHistory';
                case 'stressors':
                case 'Step8_PsychologicalStressors':
                    return 'Step8_PsychologicalStressors';
                default:
                    if (src.startsWith('Step')) return src;
                    break;
            }
        }
        const category = (item.category || '').toLowerCase();
        if (category.includes('psychosis') || category.includes('mania')) {
            return 'Step6_PsychosisMania';
        }
        if (category.includes('medical red flag')) {
            return 'Step6_MedicalRedFlags';
        }
        if (category.includes('family history')) {
            return 'Step7_FamilyHistory';
        }
        if (category.includes('top symptoms')) {
            return 'Step2_TopSymptoms';
        }
        if (category.includes('prior diagnosis')) {
            return 'Step3_PriorDiagnosis';
        }
        return 'Manual';
    }

    mapRiskSeedSource(item = {}) {
        const src = (item.source || '').trim();
        if (src) {
            if (src === 'stressors' || src === 'Step8_PsychologicalStressors') {
                return 'Step8_PsychologicalStressors';
            }
            if (src.startsWith('Step')) return src;
        }
        const category = (item.catalogCategory || '').toLowerCase();
        if (category.includes('psychological')) {
            return 'Step8_PsychologicalStressors';
        }
        return 'Manual';
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
        this.stepsReady = true;
        this.formLoadedFromServer = false;
        this.initializingCaseContext = false;
        this.clearLocalDrafts();
    }

    clearLocalDrafts() {
        try {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem('gpCaseViolenceDraft_draft');
        } catch (e) {
            // ignore storage issues
        }
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