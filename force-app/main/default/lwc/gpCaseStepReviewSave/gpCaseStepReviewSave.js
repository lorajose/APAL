import { LightningElement, api } from 'lwc';

const FALLBACK = '—';
const SOURCE_LABELS = {
    Step2_TopSymptoms: 'Step2_TopSymptoms',
    Step3_PriorDiagnosis: 'Step3_PriorDiagnosis',
    Step6_PsychosisMania: 'Step6_PsychosisMania',
    Step6_MedicalRedFlags: 'Step6_MedicalRedFlags',
    Step7_FamilyHistory: 'Step7_FamilyHistory',
    Step8_PsychologicalStressors: 'Step8_PsychologicalStressors',
    Manual: 'Manual'
};
const SOURCE_ALIASES = {
    presenting: 'Step2_TopSymptoms',
    topsymptoms: 'Step2_TopSymptoms',
    topconcerns: 'Step2_TopSymptoms',
    priordx: 'Step3_PriorDiagnosis',
    priordiagnosis: 'Step3_PriorDiagnosis',
    psychosismania: 'Step6_PsychosisMania',
    medicalredflags: 'Step6_MedicalRedFlags',
    familyhistory: 'Step7_FamilyHistory',
    psychologicalstressors: 'Step8_PsychologicalStressors',
    stressors: 'Step8_PsychologicalStressors'
};

const MED_CATALOG = [
    { id: '1', title: 'Buprenorphine/Naloxone', brand: 'Suboxone, Zubsolv', category: 'Medication-Assisted Treatment (MAT)' },
    { id: '2', title: 'Methadone', brand: 'Methadose, Dolophine', category: 'Medication-Assisted Treatment (MAT)' },
    { id: '3', title: 'Naltrexone', brand: 'Vivitrol, Revia', category: 'Medication-Assisted Treatment (MAT)' },
    { id: '4', title: 'Sertraline', brand: 'Zoloft', category: 'Antidepressant-SSRI' },
    { id: '5', title: 'Fluoxetine', brand: 'Prozac', category: 'Antidepressant-SSRI' },
    { id: '6', title: 'Venlafaxine', brand: 'Effexor', category: 'Antidepressant-SNRI' },
    { id: '7', title: 'Duloxetine', brand: 'Cymbalta', category: 'Antidepressant-SNRI' },
    { id: '8', title: 'Amitriptyline', brand: 'Elavil', category: 'Antidepressant-TCA' },
    { id: '9', title: 'Risperidone', brand: 'Risperdal', category: 'Antipsychotic-Atypical' },
    { id: '10', title: 'Olanzapine', brand: 'Zyprexa', category: 'Antipsychotic-Atypical' },
    { id: '11', title: 'Buspirone', brand: 'Buspar', category: 'Anxiolytic-Non-benzodiazepine' },
    { id: '12', title: 'Benzodiazepines', brand: 'Various (e.g., Valium, Xanax)', category: 'Anxiolytic-Benzodiazepine' },
    { id: '13', title: 'Valproate', brand: 'Depakote, Depakene', category: 'Mood Stabilizer-Anticonvulsant' },
    { id: '14', title: 'Lamotrigine', brand: 'Lamictal', category: 'Mood Stabilizer-Anticonvulsant' },
    { id: '15', title: 'Lithium', brand: 'Lithobid', category: 'Mood Stabilizer-Lithium' },
    { id: '16', title: 'Melatonin', brand: 'Various', category: 'Meds for Insomnia' },
    { id: '17', title: 'Trazodone', brand: 'Desyrel, Oleptro', category: 'Meds for Insomnia' },
    { id: '18', title: 'Atomoxetine', brand: 'Strattera', category: 'ADHD (non-stimulant)' },
    { id: '19', title: 'Clonidine', brand: 'Catapres, Kapvay', category: 'Other Medication' },
    { id: '20', title: 'Paroxetine', brand: 'Paxil', category: 'Antidepressant-SSRI' },
    { id: '21', title: 'Citalopram', brand: 'Celexa', category: 'Antidepressant-SSRI' },
    { id: '22', title: 'Escitalopram', brand: 'Lexapro', category: 'Antidepressant-SSRI' },
    { id: '23', title: 'Desvenlafaxine', brand: 'Pristiq', category: 'Antidepressant-SNRI' },
    { id: '24', title: 'Levomilnacipran', brand: 'Fetzima', category: 'Antidepressant-SNRI' },
    { id: '25', title: 'Milnacipran', brand: 'Savella', category: 'Antidepressant-SNRI' },
    { id: '26', title: 'Carbamazepine', brand: 'Tegretol', category: 'Mood Stabilizer-Anticonvulsant' },
    { id: '27', title: 'Oxcarbazepine', brand: 'Trileptal', category: 'Mood Stabilizer-Anticonvulsant' },
    { id: '28', title: 'Haloperidol', brand: 'Haldol', category: 'Antipsychotic-Typical' },
    { id: '29', title: 'Chlorpromazine', brand: 'Thorazine', category: 'Antipsychotic-Typical' },
    { id: '30', title: 'Clozapine', brand: 'Clozaril', category: 'Antipsychotic-Atypical' },
    { id: '31', title: 'Ziprasidone', brand: 'Geodon', category: 'Antipsychotic-Atypical' },
    { id: '32', title: 'Quetiapine', brand: 'Seroquel', category: 'Antipsychotic-Atypical' },
    { id: '33', title: 'Aripiprazole', brand: 'Abilify', category: 'Antipsychotic-Atypical' },
    { id: '34', title: 'Alprazolam', brand: 'Xanax', category: 'Anxiolytic-Benzodiazepine' },
    { id: '35', title: 'Lorazepam', brand: 'Ativan', category: 'Anxiolytic-Benzodiazepine' },
    { id: '36', title: 'Diazepam', brand: 'Valium', category: 'Anxiolytic-Benzodiazepine' },
    { id: '37', title: 'Clonazepam', brand: 'Klonopin', category: 'Anxiolytic-Benzodiazepine' }
];

const SUBSTANCE_CATALOG = [
    { id: 'sub-alcohol', name: 'Alcohol' },
    { id: 'sub-flower', name: 'Flower' },
    { id: 'sub-concentrates', name: 'Concentrates (Dabs)' },
    { id: 'sub-edibles', name: 'Edibles' },
    { id: 'sub-tinctures', name: 'Tinctures' },
    { id: 'sub-vapes-thc', name: 'Vapes (THC)' },
    { id: 'sub-cigarettes', name: 'Cigarettes' },
    { id: 'sub-vapes-nic', name: 'Vapes (Nicotine)' },
    { id: 'sub-heroin', name: 'Heroin' },
    { id: 'sub-fentanyl', name: 'Fentanyl' },
    { id: 'sub-rx-pain', name: 'Prescription Pain Killers' },
    { id: 'sub-cocaine', name: 'Cocaine' },
    { id: 'sub-meth', name: 'Methamphetamine' },
    { id: 'sub-benzos', name: 'Benzodiazepine' },
    { id: 'sub-ghb', name: 'GHB' },
    { id: 'sub-mdma', name: 'MDMA (Ecstasy)' },
    { id: 'sub-pcp', name: 'PCP' },
    { id: 'sub-psilocybin', name: 'Psilocybin' },
    { id: 'sub-mescaline', name: 'Mescaline' },
    { id: 'sub-synth-cannabinoids', name: 'Synthetic Cannabinoids' },
    { id: 'sub-synth-cathinones', name: 'Synthetic Cathinones' },
    { id: 'sub-ketamine', name: 'Ketamine' }
];

const SCREENER_CATALOG = [
    { id: 'scoff', name: 'SCOFF questionnaire', type: 'Eating Disorder' },
    { id: 'phq9', name: 'PHQ-9', type: 'Depression' },
    { id: 'gad7', name: 'GAD-7', type: 'Anxiety' },
    { id: 'pss', name: 'Perceived Stress Scale (PSS)', type: 'Stress' },
    { id: 'pcl5', name: 'PTSD Checklist (PCL-5)', type: 'Trauma' },
    { id: 'audit', name: 'AUDIT', type: 'Substance Use' },
    { id: 'dast10', name: 'DAST-10', type: 'Substance Use' },
    { id: 'cssrs', name: 'C-SSRS', type: 'Suicide Risk' },
    { id: 'prime', name: 'PRIME Screen', type: 'Psychosis' },
    { id: 'k10', name: 'K10', type: 'Psychological Distress' },
    { id: 'pcptsd5', name: 'PC-PTSD-5', type: 'PTSD' },
    { id: 'mdq', name: 'MDQ', type: 'Bipolar Disorder' },
    { id: 'asrs', name: 'ASRS v1.1', type: 'ADHD' },
    { id: 'bdi', name: 'BDI-II', type: 'Depression' },
    { id: 'dass21', name: 'DASS-21', type: 'Depression/Anxiety/Stress' },
    { id: 'hads', name: 'HADS', type: 'Depression/Anxiety' },
    { id: 'bai', name: 'BAI', type: 'Anxiety' }
];

const SAFETY_RISK_CATALOG = [
    { id: 'risk-access-drugs', name: 'Access to Drugs', category: 'Substance Use Risks' },
    { id: 'risk-overdose', name: 'Overdose', category: 'Substance Use Risks' },
    { id: 'risk-relapse', name: 'Substance Use Relapse', category: 'Substance Use Risks' },
    { id: 'risk-withdrawal', name: 'Withdrawal Complications', category: 'Medical/Health Complications' },
    { id: 'risk-med-management', name: 'Medication Management', category: 'Medical/Health Complications' },
    { id: 'risk-suicidal-ideation', name: 'Suicidal Ideation', category: 'Mental Health Concerns' },
    { id: 'risk-suicide-attempt', name: 'Suicide Attempt', category: 'Mental Health Concerns' },
    { id: 'risk-self-harm', name: 'Self-Harm', category: 'Mental Health Concerns' },
    { id: 'risk-mh-comorbidities', name: 'Mental Health Comorbidities', category: 'Mental Health Concerns' },
    { id: 'risk-aggressive', name: 'Aggressive Behaviors', category: 'Behavioral Concerns' },
    { id: 'risk-environmental', name: 'Environmental Risks', category: 'Environmental/Social Risks' },
    { id: 'risk-financial-employment', name: 'Financial Stability and Employment', category: 'Socioeconomic Concerns' },
    { id: 'risk-housing', name: 'Housing insecurity', category: 'Psychosocial Stressors' },
    { id: 'risk-food', name: 'Food insecurity', category: 'Psychosocial Stressors' },
    { id: 'risk-caregiver', name: 'Caregiver burden', category: 'Psychosocial Stressors' },
    { id: 'risk-legal', name: 'Legal issues', category: 'Psychosocial Stressors' },
    { id: 'risk-job', name: 'Job/school risk', category: 'Psychosocial Stressors' },
    { id: 'risk-relationship', name: 'Relationship conflict', category: 'Psychosocial Stressors' },
    { id: 'risk-limited-supports', name: 'Limited supports', category: 'Psychosocial Stressors' },
    { id: 'risk-financial-stress', name: 'Financial stress', category: 'Psychosocial Stressors' },
    { id: 'risk-firearms-unlocked', name: 'Firearms - Unlocked', category: 'Access to Means' },
    { id: 'risk-firearms-locked', name: 'Firearms - Locked', category: 'Access to Means' },
    { id: 'risk-med-supply', name: 'Large medication supply', category: 'Access to Means' },
    { id: 'risk-ligature', name: 'Ligature risk', category: 'Access to Means' },
    { id: 'risk-homicidal-ideation', name: 'Homicidal Ideation', category: 'Homicidal Ideation' }
];

const MED_INDEX = buildIndex(MED_CATALOG);
const SUBSTANCE_INDEX = buildIndex(SUBSTANCE_CATALOG);
const SCREENER_INDEX = buildIndex(SCREENER_CATALOG);
const SAFETY_INDEX = buildIndex(SAFETY_RISK_CATALOG);

function buildIndex(list) {
    return list.reduce((map, item) => {
        map[item.id] = item;
        return map;
    }, {});
}

function normalizeSourceKey(value) {
    const raw = (value || '').toString().trim();
    if (!raw) return '';
    if (raw.toLowerCase() === 'manual') return 'Manual';
    if (SOURCE_LABELS[raw]) return raw;
    const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    return SOURCE_ALIASES[compact] || raw;
}

function formatSourceLabel(value) {
    const normalized = normalizeSourceKey(value);
    return SOURCE_LABELS[normalized] || normalized || SOURCE_LABELS.Manual;
}

export default class GpCaseStepReviewSave extends LightningElement {
    @api caseId;
    @api form = {};
    @api showSummary = false;
    @api isUpdateMode = false;

    get basics() {
        return this.form.basics || {};
    }

    get presenting() {
        return this.form.presenting || {};
    }

    get priorDx() {
        return this.form.priorDx || {};
    }

    get suicide() {
        return this.form.suicide || {};
    }

    get homicide() {
        return this.form.violence || {};
    }

    get psychosis() {
        return this.form.psychosisMania || {};
    }

    get familyTrauma() {
        return this.form.familyTrauma || {};
    }

    get homeSafety() {
        return this.form.homeSafety || {};
    }

    get cognition() {
        return this.form.cognition || {};
    }

    get concerns() {
        return (Array.isArray(this.form.concerns) ? this.form.concerns : []).map(item => ({
            ...item,
            sourceLabel: formatSourceLabel(item.source || item.Seed_Source__c)
        }));
    }

    get medications() {
        return (Array.isArray(this.form.medications) ? this.form.medications : []).map(item => {
            const catalog = MED_INDEX[item.catalogId || item.id] || {};
            const title = item.catalogName
                || item.meta?.name
                || item.recordName
                || item.name
                || catalog.title
                || item.id;
            const category = item.meta?.category
                || item.catalogCategory
                || catalog.category
                || '';
            return {
                ...item,
                meta: { ...catalog, title, category }
            };
        });
    }

    get substances() {
        return (Array.isArray(this.form.substances) ? this.form.substances : []).map(item => {
            const catalog = SUBSTANCE_INDEX[item.catalogId || item.id] || {};
            const name = item.catalogName
                || item.meta?.name
                || item.recordName
                || item.name
                || catalog.name
                || item.id;
            const category = item.meta?.category
                || item.catalogCategory
                || catalog.category
                || '';
            return {
                ...item,
                meta: { ...catalog, name, category }
            };
        });
    }

    get screeners() {
        return (Array.isArray(this.form.screeners) ? this.form.screeners : []).map(item => {
            const catalog = SCREENER_INDEX[item.catalogId || item.id] || {};
            const name = item.catalogName
                || item.meta?.name
                || item.recordName
                || item.name
                || catalog.name
                || item.id;
            const category = item.meta?.category
                || item.catalogCategory
                || catalog.type
                || '';
            return {
                ...item,
                meta: { ...catalog, name, category }
            };
        });
    }

    get safetyRisks() {
        return (Array.isArray(this.form.safetyRisks) ? this.form.safetyRisks : []).map(item => {
            const catalog = SAFETY_INDEX[item.id] || {};
            const displayName = item.catalogName
                || item.meta?.name
                || catalog.name
                || item.recordName
                || item.name
                || item.id;
            const category = item.meta?.category
                || item.catalogCategory
                || catalog.category
                || '';
            return {
                ...item,
                meta: { ...catalog, name: displayName, category },
                sourceLabel: formatSourceLabel(item.source || item.Seed_Source__c)
            };
        });
    }

    get basicsSummary() {
        return [
            { label: 'Subject', value: this.formatValue(this.basics.Subject) },
            { label: 'Priority', value: this.formatValue(this.basics.Priority) },
            { label: 'Description', value: this.formatValue(this.basics.Description) }
        ];
    }

    get presentingSummary() {
        return [
            { label: 'Primary Clinical Questions', value: this.formatList(this.presenting.Primary_Clinical_Question_Types__c) },
            { label: 'Impaired Domains', value: this.formatList(this.presenting.Impaired_Domains__c) },
            { label: 'Symptom Onset Date', value: this.formatValue(this.presenting.Symptom_Onset_Date__c) },
            { label: 'Impairment Level', value: this.formatValue(this.presenting.Impairment_Level__c) },
            { label: 'Course', value: this.formatValue(this.presenting.Course__c) },
            { label: 'Abrupt Change?', value: this.presenting.Abrupt_Change__c ? 'Yes' : 'No' },
            { label: 'Other Symptoms', value: this.formatValue(this.presenting.Other_Symptoms__c || this.presenting.otherSymptoms) }
        ];
    }

    get priorSummary() {
        return [
            { label: 'Psych Hospitalizations', value: this.formatValue(this.priorDx.Psych_Hospitalizations__c) },
            { label: 'ED Visits (Psych)', value: this.formatValue(this.priorDx.ED_Visits_Count__c) },
            { label: 'Self-Harm History', value: this.formatValue(this.priorDx.Self_Harm_History__c) },
            { label: 'Other Prior Diagnosis', value: this.formatValue(this.priorDx.Other_Prior_Diagnosis__c) }
        ];
    }

    get suicideSummary() {
        return [
            { label: 'Suicidal Ideation', value: this.formatValue(this.suicide.Suicidal_Ideation__c) },
            { label: 'Protective Factors', value: this.formatValue(this.suicide.Protective_Factors__c) },
            { label: 'Access to Means', value: this.formatList(this.suicide.Access_to_Means__c) },
            { label: 'Past Attempts (#)', value: this.formatValue(this.suicide.Past_Suicide_Attempts__c) },
            { label: 'Last Attempt Date', value: this.formatDate(this.suicide.Last_Attempt_Date__c) }
        ];
    }

    get homicideSummary() {
        return [
            { label: 'Homicidal Ideation', value: this.formatValue(this.homicide.Homicidal_Ideation__c) },
            { label: 'Weapons Access', value: this.formatValue(this.homicide.Weapons_Access__c) },
            { label: 'Violence Details', value: this.formatValue(this.homicide.Violence_Details__c) },
            { label: 'Recent Violence?', value: this.homicide.Violence_Recent__c ? 'Yes' : 'No' }
        ];
    }

    get psychosisSummary() {
        return [
            { label: 'Psychosis Symptoms', value: this.formatList(this.psychosis.Psychosis_Symptoms__c) },
            { label: 'Mania Symptoms', value: this.formatList(this.psychosis.Mania_Symptoms__c) },
            { label: 'Medical Red Flags', value: this.formatList(this.psychosis.Medical_Red_Flags__c) },
            { label: 'Psychosis Notes', value: this.formatValue(this.psychosis.Psychosis_Notes__c) },
            { label: 'Red Flag Notes', value: this.formatValue(this.psychosis.Red_Flag_Notes__c) }
        ];
    }

    get familySummary() {
        return [
            { label: 'Recent Trauma', value: this.familyTrauma.Recent_Trauma__c ? 'Yes' : 'No' },
            { label: 'Child/Elder Safety Concern', value: this.familyTrauma.Dependent_Safety_Concern__c ? 'Yes' : 'No' },
            { label: 'IPV Concern', value: this.familyTrauma.IPV_Concern__c ? 'Yes' : 'No' },
            { label: 'Family History Notes', value: this.formatValue(this.familyTrauma.Family_History_Notes__c) }
        ];
    }

    get homeSafetySummary() {
        return [
            { label: 'Home Safety', value: this.formatValue(this.homeSafety.Home_Safety__c) },
            { label: 'Lethal Means Access', value: this.formatList(this.homeSafety.Lethal_Means_Access__c) },
            { label: 'Means Safety Plan', value: this.homeSafety.Means_Safety_Plan__c ? 'Yes' : 'No' },
            { label: 'Safety Notes', value: this.formatValue(this.homeSafety.Safety_Notes__c) },
            { label: 'Psychosocial Stressors', value: this.formatStressorDraft(this.homeSafety.psychosocialStressorsDraft, this.homeSafety.Psychosocial_Stressors__c) },
            { label: 'Reliable Supports', value: this.formatValue(this.homeSafety.Reliable_Supports__c) },
            { label: 'Cost/Coverage Issues', value: this.homeSafety.Cost_Coverage_Issues__c ? 'Yes' : 'No' },
            { label: 'Supports Notes', value: this.formatValue(this.homeSafety.Supports_Notes__c) }
        ];
    }

    get cognitionSummary() {
        return [
            { label: 'Orientation', value: this.formatValue(this.cognition.Orientation__c) },
            { label: 'Cognition Notes', value: this.formatValue(this.cognition.Cognition_Notes__c) }
        ];
    }

    formatValue(value) {
        if (value === null || typeof value === 'undefined' || value === '') return FALLBACK;
        return value;
    }

    formatDate(value) {
        if (!value) return FALLBACK;
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) {
            return this.formatValue(value);
        }
        return dt.toLocaleDateString();
    }

    formatList(value) {
        if (!value) return FALLBACK;
        if (Array.isArray(value)) return value.length ? value.join(', ') : FALLBACK;
        return value.split(';').filter(Boolean).join(', ') || FALLBACK;
    }

    formatStressorDraft(draftList, fallbackSerialized) {
        if (Array.isArray(draftList) && draftList.length) {
            const labels = draftList
                .map(item => item.label || item.value)
                .filter(Boolean);
            return labels.length ? labels.join(', ') : FALLBACK;
        }
        return this.formatList(fallbackSerialized);
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('previous'));
    }

    get introMessage() {
        return this.isUpdateMode
            ? 'When you click Update, the latest data will be saved back to the Case. You can still edit afterward.'
            : 'When you click Finish, you’ll see the consolidated results, including the Medications, Substances, Screeners, and Safety Risk grids. You can still edit from there.';
    }

    get primaryLabel() {
        if (this.isUpdateMode) {
            return this.showSummary ? 'Update' : 'Update & Show Results';
        }
        return this.showSummary ? 'Finish' : 'Finish & Show Results';
    }

    handleFinish() {
        const eventName = this.showSummary ? 'finalize' : 'finish';
        this.dispatchEvent(new CustomEvent(eventName));
    }

    handleEditStep(event) {
        const step = Number(event.currentTarget.dataset.step);
        if (!step) return;
        this.dispatchEvent(new CustomEvent('editstep', { detail: { step } }));
    }
}