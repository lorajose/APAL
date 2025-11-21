// Multi-step form logic, validations, dynamic fields, and lead source parsing

const formSteps = document.querySelectorAll(".form-step");
const progressBarItems = document.querySelectorAll(".progressbar li");
let currentStep = 0;

document.addEventListener("DOMContentLoaded", function () {
  showStep(currentStep);

  // Ensure error container exists
  if (!document.getElementById("form-error-message")) {
    const errorDiv = document.createElement("div");
    errorDiv.id = "form-error-message";
    errorDiv.style.color = "red";
    errorDiv.style.fontWeight = "bold";
    errorDiv.style.padding = "10px";
    errorDiv.style.marginTop = "10px";
    errorDiv.style.backgroundColor = "#ffeeee";
    errorDiv.style.border = "1px solid #ffcccc";
    errorDiv.style.borderRadius = "4px";
    errorDiv.style.display = "none";

    const progressBar = document.querySelector(".progressbar");
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.insertBefore(errorDiv, progressBar.nextSibling);
    }
  }

  // Next buttons
  const nextButtons = document.querySelectorAll(".next-btn");
  nextButtons.forEach((btn) => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      if (validateStepWithErrorMessages(currentStep)) {
        currentStep++;
        showStep(currentStep);
        hideErrorMessage();
      }
    });
  });

  // Previous buttons
  const prevButtons = document.querySelectorAll(".prev-btn");
  prevButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
        hideErrorMessage();
      }
    });
  });

  // Submit button
  const submitBtn = document.getElementById("submit-complete");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    submitBtn.style.cursor = "pointer";

    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();

      if (!validateStepWithErrorMessages(currentStep)) {
        return;
      }

      // Handle trainee end date conversion
      const trainEndDateInput = document.getElementById("trainenddate");
      const trainEndDateHidden = document.getElementById("trainenddate_hidden");
      if (trainEndDateInput && trainEndDateHidden) {
        const dateVal = trainEndDateInput.value;
        if (dateVal) {
          const [year, month, day] = dateVal.split("-");
          trainEndDateHidden.value = `${month}/${day}/${year}`;
        } else {
          trainEndDateHidden.value = "";
        }
      }

      // reCAPTCHA response
      const recaptchaTokenInput = document.querySelector(
        '[name="g-recaptcha-response"]'
      );
      if (recaptchaTokenInput && recaptchaTokenInput.value.trim() !== "") {
        const recaptchaResponseField =
          document.getElementById("recaptchaResponse");
        if (recaptchaResponseField) {
          recaptchaResponseField.value = recaptchaTokenInput.value;
        }
        const form = document.getElementById("multi-step-form");
        if (form) {
          form.submit();
        }
      } else {
        alert("Please complete the reCAPTCHA before submitting the form.");
      }
    });
  }

  // Close modal
  const closeBtn = document.getElementById("close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      const modal = document.getElementById("thank-you-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  // Inputs change handling
  const allInputs = document.querySelectorAll(
    ".form-step input, .form-step select"
  );
  allInputs.forEach((input) => {
    input.addEventListener("input", handleFieldInput);
    input.addEventListener("change", handleFieldInput);
  });

  // Initialize lead source
  applyLeadSourceFromQuery();
});

// Handle field-level validation highlight
function handleFieldInput(event) {
  const field = event.target;

  if (field.classList.contains("hidden") || !field.required) {
    return;
  }

  if (field.checkValidity()) {
    unhighlightField(field);
  } else {
    highlightField(field);
  }
}

// Show current step and update progress bar
function showStep(stepIndex) {
  formSteps.forEach((step, idx) => {
    step.classList.toggle("active", idx === stepIndex);
  });

  progressBarItems.forEach((item, idx) => {
    item.classList.toggle("active", idx <= stepIndex);
  });

  toggleFields();

  const container = document.querySelector(".form-container");
  if (container) {
    container.scrollIntoView({ behavior: "smooth" });
  }
}

// Validate current step, gather error messages
function validateStepWithErrorMessages(stepIndex) {
  toggleFields();

  const activeStep = formSteps[stepIndex];
  if (!activeStep) {
    return true;
  }

  const requiredFields = activeStep.querySelectorAll("[required]:not(.hidden)");
  let isValid = true;
  const messages = [];

  requiredFields.forEach((field) => {
    const labelText = getFieldLabel(field);

    if (field.tagName === "SELECT") {
      if (
        field.value === "" ||
        field.value === "--None--" ||
        field.value === "--Select--"
      ) {
        isValid = false;
        messages.push(`Please select an option for "${labelText}"`);
        highlightField(field);
      } else {
        unhighlightField(field);
      }
    } else if (field.type === "checkbox") {
      if (!field.checked) {
        isValid = false;
        messages.push(`Please check "${labelText}"`);
        highlightField(field);
      } else {
        unhighlightField(field);
      }
    } else if (field.type === "radio") {
      const groupName = field.name;
      const checked = activeStep.querySelector(
        `input[name="${groupName}"]:checked`
      );
      if (!checked) {
        isValid = false;
        messages.push(`Please select an option for "${labelText}"`);
        highlightField(field);
      } else {
        unhighlightField(field);
      }
    } else {
      const value = field.value ? field.value.trim() : "";
      if (!value) {
        isValid = false;
        messages.push(`Please fill in "${labelText}"`);
        highlightField(field);
      } else if (!field.checkValidity()) {
        isValid = false;
        messages.push(
          `Please enter valid information for "${labelText}"`
        );
        highlightField(field);
      } else {
        unhighlightField(field);
      }
    }
  });

  if (!isValid) {
    showErrorMessage(messages);
  } else {
    hideErrorMessage();
  }

  updateIncompleteSubmission();
  return isValid;
}

// Toggle dynamic fields based on select/checkbox values
function toggleFields() {
  // Trainee logic
  const traineeSelect = document.getElementById("The_provider_is_a_Trainee__c");
  const traineeTypeLabel = document.getElementById("Trainee_Type_Label");
  const traineeTypeSelect = document.getElementById("Trainee_Type__c");
  const otherTraineeLabel = document.getElementById(
    "otherMedicalTraineeDescriptionid"
  );
  const otherTraineeInput = document.getElementById(
    "Other_Medical_Trainee_Description__c"
  );
  const trainEndDateLabel = document.getElementById("trainenddate_label");
  const trainEndDate = document.getElementById("trainenddate");

  if (traineeSelect && traineeSelect.value === "Yes") {
    traineeTypeLabel.classList.remove("hidden");
    traineeTypeSelect.classList.remove("hidden");
    traineeTypeSelect.required = true;
  } else if (traineeSelect) {
    traineeTypeLabel.classList.add("hidden");
    traineeTypeSelect.classList.add("hidden");
    traineeTypeSelect.required = false;
    traineeTypeSelect.value = "";

    otherTraineeLabel.classList.add("hidden");
    otherTraineeInput.classList.add("hidden");
    otherTraineeInput.required = false;
    otherTraineeInput.value = "";

    trainEndDateLabel.classList.add("hidden");
    trainEndDate.classList.add("hidden");
    trainEndDate.required = false;
    trainEndDate.value = "";
  }

  if (
    traineeSelect &&
    traineeSelect.value === "Yes" &&
    traineeTypeSelect &&
    traineeTypeSelect.value
  ) {
    if (traineeTypeSelect.value === "Other medical trainee") {
      otherTraineeLabel.classList.remove("hidden");
      otherTraineeInput.classList.remove("hidden");
      otherTraineeInput.required = true;

      trainEndDateLabel.classList.add("hidden");
      trainEndDate.classList.add("hidden");
      trainEndDate.required = false;
      trainEndDate.value = "";
    } else if (
      traineeTypeSelect.value.indexOf(
        "Student in a medical field (e.g., medical student, PA student)"
      ) > -1
    ) {
      trainEndDateLabel.classList.remove("hidden");
      trainEndDate.classList.remove("hidden");
      trainEndDate.required = true;

      otherTraineeLabel.classList.add("hidden");
      otherTraineeInput.classList.add("hidden");
      otherTraineeInput.required = false;
      otherTraineeInput.value = "";
    } else {
      otherTraineeLabel.classList.add("hidden");
      otherTraineeInput.classList.add("hidden");
      otherTraineeInput.required = false;
      otherTraineeInput.value = "";

      trainEndDateLabel.classList.add("hidden");
      trainEndDate.classList.add("hidden");
      trainEndDate.required = false;
      trainEndDate.value = "";
    }
  }

  // Specialty Mental Health Training
  const mhTrainingSelect = document.getElementById(
    "Specialty_Mental_Health_Training__c"
  );
  const mhTrainingLabel = document.getElementById("mhTrainingDescLabel");
  const mhTrainingDescInput = document.getElementById(
    "Specialty_Mental_Health_Training_Desc__c"
  );

  if (mhTrainingSelect && mhTrainingSelect.value === "Yes") {
    mhTrainingLabel.classList.remove("hidden");
    mhTrainingDescInput.classList.remove("hidden");
    mhTrainingDescInput.required = true;
  } else if (mhTrainingSelect) {
    mhTrainingLabel.classList.add("hidden");
    mhTrainingDescInput.classList.add("hidden");
    mhTrainingDescInput.required = false;
    mhTrainingDescInput.value = "";
  }

  // Provider Type Other
  const providerTypeSelect = document.getElementById("type");
  const otherProviderLabel = document.getElementById("Other-Provider-id");
  const otherProviderInput = document.getElementById("pcpothersta_desc__c");

  if (providerTypeSelect && providerTypeSelect.value === "Other") {
    otherProviderLabel.classList.remove("hidden");
    otherProviderInput.classList.remove("hidden");
    otherProviderInput.required = true;
  } else if (providerTypeSelect) {
    otherProviderLabel.classList.add("hidden");
    otherProviderInput.classList.add("hidden");
    otherProviderInput.required = false;
    otherProviderInput.value = "";
  }

  // Specialty Other
  const specialtySelect = document.getElementById("specialty-desc");
  const otherSpecialtyLabel = document.getElementById("Other-specialty-id");
  const otherSpecialtyInput = document.getElementById("other-specialty-desc");

  if (specialtySelect && specialtySelect.value === "Other") {
    otherSpecialtyLabel.classList.remove("hidden");
    otherSpecialtyInput.classList.remove("hidden");
    otherSpecialtyInput.required = true;
  } else if (specialtySelect) {
    otherSpecialtyLabel.classList.add("hidden");
    otherSpecialtyInput.classList.add("hidden");
    otherSpecialtyInput.required = false;
    otherSpecialtyInput.value = "";
  }

  // How did you hear - Other
  const otherCheck = document.getElementById("otherCheck");
  const heardOtherLabel = document.getElementById("heard_other_label");
  const heardOtherInput = document.getElementById("heard_other");

  if (otherCheck && otherCheck.checked) {
    heardOtherLabel.classList.remove("hidden");
    heardOtherInput.classList.remove("hidden");
    heardOtherInput.required = true;
  } else if (otherCheck) {
    heardOtherLabel.classList.add("hidden");
    heardOtherInput.classList.add("hidden");
    heardOtherInput.required = false;
    heardOtherInput.value = "";
  }

  // Race self-describe
  const raceSelect = document.getElementById(
    "How_do_You_Identify_with_Respect_to_Race__c"
  );
  const raceDescLabel = document.getElementById("pcpracedesc-id");
  const raceDescInput = document.getElementById("pcpracedesc");

  if (
    raceSelect &&
    raceSelect.value === "Prefer to self-describe (option not listed)"
  ) {
    raceDescLabel.classList.remove("hidden");
    raceDescInput.classList.remove("hidden");
    raceDescInput.required = true;
  } else if (raceSelect) {
    raceDescLabel.classList.add("hidden");
    raceDescInput.classList.add("hidden");
    raceDescInput.required = false;
    raceDescInput.value = "";
  }

  // Provider language other than English
  const languageSelect = document.getElementById(
    "Provider_Language_other_than_English__c"
  );
  const langDescLabel = document.getElementById("Provider-Description-id");
  const langDescInput = document.getElementById(
    "Provider_Languages_Description__c"
  );

  if (languageSelect && languageSelect.value === "Other") {
    langDescLabel.classList.remove("hidden");
    langDescInput.classList.remove("hidden");
    langDescInput.required = true;
  } else if (languageSelect) {
    langDescLabel.classList.add("hidden");
    langDescInput.classList.add("hidden");
    langDescInput.required = false;
    langDescInput.value = "";
  }
}

// Dummy function (placeholder to comply with previous logic)
// Currently this just walks fields to "touch" them; implement if needed
function updateIncompleteSubmission() {
  const fieldIds = [
    "first_name",
    "last_name",
    "provider-npi",
    "email",
    "phone",
    "phone-ext",
    "The_provider_is_a_Trainee__c",
    "Trainee_Type__c",
    "Other_Medical_Trainee_Description__c",
    "Number_of_Years_In_Practice__c",
    "trainenddate",
    "Specialty_Mental_Health_Training__c",
    "Specialty_Mental_Health_Training_Desc__c",
    "home-phone",
    "mobile",
    "type",
    "pcpothersta_desc__c",
    "specialty-desc",
    "other-specialty-desc",
    "health-haven-staff",
    "enrolled-provider",
    "friend-colleague",
    "friend-association",
    "friend-media",
    "search-engine",
    "news-story",
    "conference",
    "otherCheck",
    "heard_other",
    "Do_you_think_of_yourself_as__c",
    "How_do_You_Identify_with_Respect_to_Race__c",
    "pcpracedesc",
    "Provider_Language_other_than_English__c",
    "Provider_Languages_Description__c",
    "opt_out",
  ];

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      const checked = el.checked;
    } else {
      const hasValue = !!el.value && el.value.trim() !== "";
    }
  });
}

// Retrieve friendly label for field
function getFieldLabel(field) {
  const id = field.id;
  const label = document.querySelector(`label[for="${id}"]`);

  if (label && label.textContent) {
    return label.textContent.replace("*", "").trim();
  }

  return field.name || field.id || "Unknown field";
}

// Highlight invalid field
function highlightField(field) {
  field.style.border = "2px solid red";
  field.style.backgroundColor = "#fff0f0";
}

// Clear highlight
function unhighlightField(field) {
  field.style.border = "1px solid #ccc";
  field.style.backgroundColor = "";
}

// Show aggregated error messages
function showErrorMessage(messages) {
  const errorDiv = document.getElementById("form-error-message");
  if (!errorDiv) return;

  let html = "<strong>Please fix the following errors:</strong><ul>";
  messages.forEach((msg) => {
    html += `<li>${msg}</li>`;
  });
  html += "</ul>";

  errorDiv.innerHTML = html;
  errorDiv.style.display = "block";
  errorDiv.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Hide errors
function hideErrorMessage() {
  const errorDiv = document.getElementById("form-error-message");
  if (!errorDiv) return;

  errorDiv.style.display = "none";
  errorDiv.innerHTML = "";
}

// Phone number formatter
function formatPhoneNumber(raw) {
  let digits = raw.replace(/\D/g, "");
  digits = digits.slice(0, 10);

  const len = digits.length;
  if (len < 4) {
    return digits;
  } else if (len < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
      6,
      10
    )}`;
  }
}

// Lead Source from querystring
function applyLeadSourceFromQuery() {
  const DEFAULT = "Web";
  const paramNames = ["leadsource", "leadSource", "LeadSource"];
  const qs = new URLSearchParams(window.location.search);

  let raw = null;
  for (const key of paramNames) {
    const val = qs.get(key);
    if (val !== null && val !== "") {
      raw = val;
      break;
    }
  }

  let clean = DEFAULT;
  if (raw != null) {
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {
      // ignore decode errors
    }

    clean = String(raw)
      // remove control chars
      .replace(/[\u0000-\u001F\u007F]/g, "")
      // strip HTML brackets
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 100);

    if (clean.length === 0) {
      clean = DEFAULT;
    }
  }

  const field = document.getElementById("lead_source");
  if (field) {
    field.value = clean;
    console.log("Lead Source set to:", clean);
  } else {
    console.warn("lead_source field not found");
  }
}
