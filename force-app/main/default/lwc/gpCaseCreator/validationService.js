// validationService.js (Corregido)
// validationService.js

/**
 * Define las reglas de validación (Hard y Soft) para cada paso del formulario.
 * @typedef {object} ValidationResult
 * @property {boolean} isValid - True si pasó TODAS las validaciones duras (hardErrors).
 * @property {Array<object>} hardErrors - Errores que bloquean el avance (ej: campos requeridos vacíos).
 * @property {Array<object>} softWarnings - Advertencias que NO bloquean el avance (ej: datos incompletos).
 */

// --- 1. Reglas de Validación Específicas por Paso ---

/**
 * Validación para el Paso 1 (Basics)
 * HARD: Subject, Priority, Description son requeridos.
 */
function normalizeMultiValue(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateBasics(formData) {
  const data = formData.basics || {};
  const errors = [];
  const warnings = [];

  const normalize = (value) => (value ?? '').toString().trim();

  if (!normalize(data.Subject)) {
    errors.push({
      path: 'Subject',
      message: 'Subject is a required field.'
    });
  }

 /* if (!normalize(data.Priority)) {
    errors.push({
      path: 'Priority',
      message: 'Priority is a required field.'
    });
  } */

  if (!normalize(data.Description)) {
    errors.push({
      path: 'Description',
      message: 'Description is a required field.'
    });
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

/**
 * Validación de ejemplo para el Paso 2 (Presenting & Availability)
 * SOFT: reasonForReferral es recomendado.
 */
function validatePresenting(formData, config = {}) {
  const data = formData.presenting || {};
  const errors = [];
  const warnings = [];

  const pcqtPicklist = normalizeMultiValue(data.Primary_Clinical_Question_Types__c);
  const pcqtDraft = Array.isArray(data.primaryClinicalQuestionTypesDraft)
    ? data.primaryClinicalQuestionTypesDraft.filter(Boolean)
    : [];
  const hasPcqt = pcqtPicklist.length > 0 || pcqtDraft.length > 0;

  if (!hasPcqt) {
    const message = 'Select at least one primary clinical question.';
    if (config.strict) {
      errors.push({
        path: 'Primary_Clinical_Question_Types__c',
        message
      });
    } else {
      warnings.push({
        path: 'Primary_Clinical_Question_Types__c',
        message
      });
    }
  }

  if (data.reasonForReferral && data.reasonForReferral.trim().length < 50) {
    warnings.push({
      path: 'reasonForReferral',
      message: 'A more detailed description of the reason for referral is recommended.'
    });
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

function validateSuicide(formData, config = {}) {
  const data = formData.suicide || {};
  const errors = [];
  const warnings = [];

  const ideation = (data.Suicidal_Ideation__c || '').toString().trim();
  if (!ideation) {
    const message = 'Suicidal Ideation is required.';
    if (config.strict) {
      errors.push({
        path: 'Suicidal_Ideation__c',
        message
      });
    } else {
      warnings.push({
        path: 'Suicidal_Ideation__c',
        message
      });
    }
  }

  const requiresDetail = ideation && ideation !== 'None';
  if (requiresDetail) {
    const protective = (data.Protective_Factors__c || '').toString().trim();
    if (!protective) {
      errors.push({
        path: 'Protective_Factors__c',
        message: 'Protective Factors is required when Suicidal Ideation is not “None”.'
      });
    }

    const means = normalizeMultiValue(data.Access_to_Means__c);
    if (!means.length) {
      errors.push({
        path: 'Access_to_Means__c',
        message: 'Access to Means is required when Suicidal Ideation is not “None”.'
      });
    }

    const attemptsValue = data.Past_Suicide_Attempts__c;
    if (attemptsValue === '' || attemptsValue === null || typeof attemptsValue === 'undefined') {
      errors.push({
        path: 'Past_Suicide_Attempts__c',
        message: 'Past Suicide Attempts is required when Suicidal Ideation is not “None”.'
      });
    } else {
      const parsed = Number(attemptsValue);
      if (isNaN(parsed) || parsed < 0) {
        errors.push({
          path: 'Past_Suicide_Attempts__c',
          message: 'Past Suicide Attempts must be zero or greater.'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

function validateHomicide(formData, config = {}) {
  const data = formData.violence || {};
  const errors = [];
  const warnings = [];

  const ideation = (data.Homicidal_Ideation__c || '').toString().trim();
  const requiresDetail = ideation && !['None'].includes(ideation);

  if (!ideation) {
    const message = 'Homicidal Ideation is required.';
    if (config.strict) {
      errors.push({
        path: 'Homicidal_Ideation__c',
        message
      });
    } else {
      warnings.push({
        path: 'Homicidal_Ideation__c',
        message
      });
      return {
        isValid: true,
        hardErrors: [],
        softWarnings: warnings
      };
    }
  }

  if (requiresDetail) {
    const details = (data.Violence_Details__c || '').toString().trim();
    if (!details) {
      errors.push({
        path: 'Violence_Details__c',
        message: 'Violence/Threat Details is required when Homicidal Ideation is not “None”.'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

function validateHomeSafety(formData, config = {}) {
  const data = formData.homeSafety || {};
  const errors = [];
  const warnings = [];

  const status = (data.Home_Safety__c || '').toString().trim();
  if (!status) {
    const message = 'Home Safety is required.';
    if (config.strict) {
      errors.push({
        path: 'Home_Safety__c',
        message
      });
    } else {
      warnings.push({
        path: 'Home_Safety__c',
        message
      });
    }
  }

  if (status && status !== 'Safe') {
    const means = normalizeMultiValue(data.Lethal_Means_Access__c);
    if (!means.length) {
      errors.push({
        path: 'Lethal_Means_Access__c',
        message: 'Lethal Means Access is required when Home Safety is “Unsafe” or “Unknown”.'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

function validateCognition(formData, config = {}) {
  const data = formData.cognition || {};
  const errors = [];
  const warnings = [];

  const orientation = (data.Orientation__c || '').toString().trim();
  if (!orientation) {
    const message = 'Orientation is required.';
    if (config.strict) {
      errors.push({
        path: 'Orientation__c',
        message
      });
    } else {
      warnings.push({
        path: 'Orientation__c',
        message
      });
    }
  }

  if (orientation && orientation !== 'Alert & oriented (x3)') {
    const notes = (data.Cognition_Notes__c || '').toString().trim();
    if (!notes) {
      errors.push({
        path: 'Cognition_Notes__c',
        message: 'Cognition Notes is required when Orientation is not “Alert & oriented (x3)”.'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

function validateFamilyTrauma(formData) {
  const data = formData.familyTrauma || {};
  const errors = [];
  const warnings = [];

  const familyHistory = normalizeMultiValue(data.Family_History__c);
  if (familyHistory.length > 0) {
    const notes = (data.Family_History_Notes__c || '').toString().trim();
    if (!notes) {
      errors.push({
        path: 'Family_History_Notes__c',
        message: 'Family History Notes are Required.'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    hardErrors: errors,
    softWarnings: warnings
  };
}

/**
 * Función de validación por defecto para pasos no críticos o vacíos.
 */
function validateConcerns(formData) {
  const list = Array.isArray(formData.concerns) ? formData.concerns : [];
  const warnings = [];
  if (list.length === 0) {
    warnings.push({
      path: 'concerns',
      message: 'Add at least one concern before finishing the intake.'
    });
  }
  return {
    isValid: true,
    hardErrors: [],
    softWarnings: warnings
  };
}

function validateDefault() {
    return {
        isValid: true,
        hardErrors: [],
        softWarnings: []
    };
}


// --- 2. Funciones de Enrutamiento y Exposición ---

/**
 * Mapea el número del paso a su función de validación.
 */
const validationMap = {
  1: validateBasics,
  2: validatePresenting,
  4: validateSuicide,
  5: validateHomicide,
  7: validateFamilyTrauma,
  8: validateHomeSafety,
  9: validateCognition,
  13: validateConcerns,
  // Para los pasos restantes, se usa una validación por defecto.
  default: validateDefault
};

/**
 * Ejecuta la validación para un paso específico.
 * @param {number} step - Número del paso a validar.
 * @param {object} formData - Objeto central del formulario (this.form).
 * @returns {ValidationResult} - Resultado de la validación.
 */
export function validateStep(step, formData, config = {}) {
  const validator = validationMap[step] || validationMap.default;
  return validator(formData, config);
}

/**
 * Ejecuta la validación para todos los pasos relevantes (1 a 15).
 * @param {object} formData - Objeto central del formulario (this.form).
 * @returns {object} - Objeto con los resultados de validación por número de paso.
 */
export function validateAll(formData) {
  const results = {};
  
  // Itera por los 15 pasos para asegurar que todos los resultados existan
  for (let i = 1; i <= 15; i++) {
      results[i] = validateStep(i, formData, { strict: true });
  }

  return results;
}