const MEDICATION_ITEMS = [
    { id: '1', title: 'Buprenorphine/Naloxone', brand: 'Suboxone, Zubsolv', category: 'Medication-Assisted Treatment (MAT)', description: 'Used in opioid addiction to reduce dependence and withdrawal symptoms.' },
    { id: '2', title: 'Methadone', brand: 'Methadose, Dolophine', category: 'Medication-Assisted Treatment (MAT)', description: 'Helps treat opioid addiction by reducing cravings and withdrawal symptoms.' },
    { id: '3', title: 'Naltrexone', brand: 'Vivitrol, Revia', category: 'Medication-Assisted Treatment (MAT)', description: 'Blocks the effects of opioids and alcohol, used to prevent relapse.' },
    { id: '4', title: 'Sertraline', brand: 'Zoloft', category: 'Antidepressant-SSRI', description: 'Commonly used to treat depression, which can co-occur with substance abuse.' },
    { id: '5', title: 'Fluoxetine', brand: 'Prozac', category: 'Antidepressant-SSRI', description: 'Used for depression and anxiety, helpful in dual-diagnosis patients.' },
    { id: '6', title: 'Venlafaxine', brand: 'Effexor', category: 'Antidepressant-SNRI', description: 'Treats depression and anxiety, conditions often found with addiction.' },
    { id: '7', title: 'Duloxetine', brand: 'Cymbalta', category: 'Antidepressant-SNRI', description: 'Useful for depression and generalized anxiety disorder.' },
    { id: '8', title: 'Amitriptyline', brand: 'Elavil', category: 'Antidepressant-TCA', description: 'Used for major depressive disorder; less common due to side effects but effective in certain cases.' },
    { id: '9', title: 'Risperidone', brand: 'Risperdal', category: 'Antipsychotic-Atypical', description: 'Manages symptoms of psychosis which can accompany addiction.' },
    { id: '10', title: 'Olanzapine', brand: 'Zyprexa', category: 'Antipsychotic-Atypical', description: 'Used for treating bipolar disorder and schizophrenia along with addiction.' },
    { id: '11', title: 'Buspirone', brand: 'Buspar', category: 'Anxiolytic-Non-benzodiazepine', description: 'Treats anxiety without the high abuse potential of benzodiazepines.' },
    { id: '12', title: 'Benzodiazepines', brand: 'Various (e.g., Valium, Xanax)', category: 'Anxiolytic-Benzodiazepine', description: 'Used with caution for severe anxiety in controlled settings due to potential for abuse.' },
    { id: '13', title: 'Valproate', brand: 'Depakote, Depakene', category: 'Mood Stabilizer-Anticonvulsant', description: 'Used in bipolar disorder, helpful for stabilizing mood swings that may trigger substance use.' },
    { id: '14', title: 'Lamotrigine', brand: 'Lamictal', category: 'Mood Stabilizer-Anticonvulsant', description: 'Manages bipolar disorder, reducing the frequency of mood swings.' },
    { id: '15', title: 'Lithium', brand: 'Lithobid', category: 'Mood Stabilizer-Lithium', description: 'Effective in managing bipolar disorder, closely monitored due to narrow therapeutic window.' },
    { id: '16', title: 'Melatonin', brand: 'Various', category: 'Meds for Insomnia', description: 'A safer option for managing sleep disturbances in addiction patients.' },
    { id: '17', title: 'Trazodone', brand: 'Desyrel, Oleptro', category: 'Meds for Insomnia', description: 'Often prescribed for sleep issues and depression; lower risk of dependency.' },
    { id: '18', title: 'Atomoxetine', brand: 'Strattera', category: 'ADHD (non-stimulant)', description: 'A non-stimulant treatment for ADHD, preferred in patients with a history of substance abuse.' },
    { id: '19', title: 'Clonidine', brand: 'Catapres, Kapvay', category: 'Other Medication', description: 'Often used off-label to manage withdrawal symptoms in addiction treatment, especially for opioids.' },
    { id: '20', title: 'Paroxetine', brand: 'Paxil', category: 'Antidepressant-SSRI', description: 'Selective serotonin reuptake inhibitor (SSRI) approved to treat depression and anxiety disorders.' },
    { id: '21', title: 'Citalopram', brand: 'Celexa', category: 'Antidepressant-SSRI', description: 'SSRI used to treat depression and certain anxiety disorders.' },
    { id: '22', title: 'Escitalopram', brand: 'Lexapro', category: 'Antidepressant-SSRI', description: 'SSRI for major depressive disorder and generalized anxiety disorder.' },
    { id: '23', title: 'Desvenlafaxine', brand: 'Pristiq', category: 'Antidepressant-SNRI', description: 'Serotonin–norepinephrine reuptake inhibitor (SNRI) for major depressive disorder.' },
    { id: '24', title: 'Levomilnacipran', brand: 'Fetzima', category: 'Antidepressant-SNRI', description: 'SNRI used to treat major depressive disorder.' },
    { id: '25', title: 'Milnacipran', brand: 'Savella', category: 'Antidepressant-SNRI', description: 'SNRI approved for fibromyalgia and used off-label for depression.' },
    { id: '26', title: 'Carbamazepine', brand: 'Tegretol', category: 'Mood Stabilizer-Anticonvulsant', description: 'Anticonvulsant mood stabilizer used to treat bipolar disorder and seizure disorders.' },
    { id: '27', title: 'Oxcarbazepine', brand: 'Trileptal', category: 'Mood Stabilizer-Anticonvulsant', description: 'Anticonvulsant mood stabilizer used for bipolar disorder and seizures.' },
    { id: '28', title: 'Haloperidol', brand: 'Haldol', category: 'Antipsychotic-Typical', description: 'First-generation (typical) antipsychotic for schizophrenia and acute psychosis.' },
    { id: '29', title: 'Chlorpromazine', brand: 'Thorazine', category: 'Antipsychotic-Typical', description: 'Typical antipsychotic used for psychotic disorders and severe nausea.' },
    { id: '30', title: 'Clozapine', brand: 'Clozaril', category: 'Antipsychotic-Atypical', description: 'Second-generation antipsychotic for treatment-resistant schizophrenia.' },
    { id: '31', title: 'Ziprasidone', brand: 'Geodon', category: 'Antipsychotic-Atypical', description: 'Second-generation antipsychotic used for schizophrenia and bipolar disorder.' },
    { id: '32', title: 'Quetiapine', brand: 'Seroquel', category: 'Antipsychotic-Atypical', description: 'Atypical antipsychotic used for schizophrenia, bipolar disorder, and major depressive disorder.' },
    { id: '33', title: 'Aripiprazole', brand: 'Abilify', category: 'Antipsychotic-Atypical', description: 'Partial dopamine agonist used for schizophrenia, bipolar disorder, and adjunct for depression.' },
    { id: '34', title: 'Alprazolam', brand: 'Xanax', category: 'Anxiolytic-Benzodiazepine', description: 'Short-acting benzodiazepine for anxiety disorders and panic disorder.' },
    { id: '35', title: 'Lorazepam', brand: 'Ativan', category: 'Anxiolytic-Benzodiazepine', description: 'Intermediate-acting benzodiazepine used to treat anxiety, insomnia, and status epilepticus.' },
    { id: '36', title: 'Diazepam', brand: 'Valium', category: 'Anxiolytic-Benzodiazepine', description: 'Long-acting benzodiazepine for anxiety, muscle spasms, and seizures.' },
    { id: '37', title: 'Clonazepam', brand: 'Klonopin', category: 'Anxiolytic-Benzodiazepine', description: 'Benzodiazepine used for panic disorder and seizure disorders.' }
];

const MEDICATION_INDEX = MEDICATION_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const SUBSTANCE_ITEMS = [
    // Alcohol
    { id: 'sub-alcohol', name: 'Alcohol', category: 'Alcohol', description: 'A widely consumed depressant found in beverages like beer, wine, and spirits, known for its effects on mood and behavior.' },
    { id: 'sub-addiction-generic', name: 'Substance – Addiction', category: 'Alcohol', description: 'General addiction-related alcohol use.' },

    // Hallucinogens
    { id: 'sub-mdma', name: 'MDMA (Ecstasy)', category: 'Hallucinogens', description: 'A synthetic drug with stimulant and hallucinogenic properties, commonly known as ecstasy or molly.' },
    { id: 'sub-pcp', name: 'PCP', category: 'Hallucinogens', description: 'A dissociative hallucinogenic drug, also known as phencyclidine or angel dust.' },
    { id: 'sub-psilocybin', name: 'Psilocybin', category: 'Hallucinogens', description: 'A naturally occurring hallucinogen found in certain mushrooms, known as magic mushrooms.' },
    { id: 'sub-mescaline', name: 'Mescaline', category: 'Hallucinogens', description: 'A hallucinogenic compound derived from the peyote cactus.' },

    // Herbal Psychoactive
    { id: 'sub-kratom', name: 'Kratom', category: 'Herbal Psychoactive', description: 'Mitragyna speciosa; opioid-like plant.' },

    // Marijuana (THC)
    { id: 'sub-flower', name: 'Flower', category: 'Marijuana (THC)', description: 'The dried buds of the cannabis plant, typically smoked.' },
    { id: 'sub-concentrates', name: 'Concentrates (Dabs)', category: 'Marijuana (THC)', description: 'Highly concentrated THC extracted from cannabis, typically vaporized or dabbed.' },
    { id: 'sub-edibles', name: 'Edibles', category: 'Marijuana (THC)', description: 'Food products infused with cannabis extracts, ingested orally.' },
    { id: 'sub-tinctures', name: 'Tinctures', category: 'Marijuana (THC)', description: 'Liquid cannabis extracts taken sublingually.' },
    { id: 'sub-vapes-thc', name: 'Vapes', category: 'Marijuana (THC)', description: 'Cannabis oil or distillate used in vaporizing devices.' },

    // Nicotine
    { id: 'sub-cigarettes', name: 'Cigarettes', category: 'Nicotine', description: 'Found in tobacco products like cigarettes; an addictive stimulant.' },
    { id: 'sub-vapes-nic', name: 'Vapes', category: 'Nicotine', description: 'Found in electronic vaping devices; an addictive stimulant.' },
    { id: 'sub-nicotine-tobacco', name: 'Nicotine/Tobacco', category: 'Nicotine', description: 'Tobacco or nicotine product use.' },

    // Opioids
    { id: 'sub-heroin', name: 'Heroin', category: 'Opioids', description: 'An opioid derived from morphine, known for its strong pain-relieving properties and high addiction potential.' },
    { id: 'sub-fentanyl', name: 'Fentanyl', category: 'Opioids', description: 'A synthetic opioid, much more potent than heroin or morphine, used medically for severe pain.' },
    { id: 'sub-rx-pain', name: 'Prescription Pain Killers', category: 'Opioids', description: 'Opioids prescribed for pain relief, including oxycodone, hydrocodone, and morphine.' },

    // Prescription Stimulant
    { id: 'sub-rx-stimulant', name: 'Prescription Stimulants (e.g., Adderall)', category: 'Prescription Stimulant', description: 'Prescription stimulant use (e.g., Adderall, Ritalin).' },

    // Sedatives
    { id: 'sub-psych-sedative', name: 'Substance – Psychiatry', category: 'Sedatives', description: 'Psychiatric sedative use.' },
    { id: 'sub-benzos', name: 'Benzodiazepine', category: 'Sedatives', description: 'Sedatives prescribed for anxiety, insomnia, and other conditions, including drugs like Valium and Xanax.' },
    { id: 'sub-ghb', name: 'GHB', category: 'Sedatives', description: 'A central nervous system depressant, often used recreationally or for its sedative effects.' },

    // Stimulants
    { id: 'sub-cocaine', name: 'Cocaine', category: 'Stimulants', description: 'A powerful stimulant derived from coca leaves, commonly snorted or injected.' },
    { id: 'sub-meth', name: 'Methamphetamine', category: 'Stimulants', description: 'A highly addictive stimulant affecting the central nervous system, often called meth or crystal meth.' },

    // Synthetics
    { id: 'sub-synth-cannabinoids', name: 'Synthetic Cannabinoids', category: 'Synthetics', description: 'Man-made chemicals that mimic the effects of THC, found in products like K2 and Spice.' },
    { id: 'sub-synth-cathinones', name: 'Synthetic Cathinones', category: 'Synthetics', description: 'Stimulant drugs often found in bath salts, chemically similar to amphetamines.' },
    { id: 'sub-ketamine', name: 'Ketamine', category: 'Synthetics', description: 'A dissociative anesthetic used medically and recreationally, known for its hallucinogenic effects.' }
];

const SUBSTANCE_INDEX = SUBSTANCE_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const SCREENER_ITEMS = [
    // Anxiety
    { id: 'screener-psychiatry', name: 'screener – psychiatry', type: 'Anxiety', positiveOutcome: '', notes: '' },
    { id: 'gad7', name: 'GAD-7', type: 'Anxiety', positiveOutcome: 'Score ≥10', notes: '0–4: Minimal anxiety; 5–9: Mild anxiety; 10–14: Moderate anxiety; 15–21: Severe anxiety' },
    { id: 'bai', name: 'Beck Anxiety Inventory (BAI)', type: 'Anxiety', positiveOutcome: 'Higher scores indicate more severe anxiety', notes: '21-item inventory; scores ≥16 suggest moderate to severe anxiety' },

    // Cognitive Assessment
    { id: 'moca', name: 'Montreal Cognitive Assessment (MoCA)', type: 'Cognitive Assessment', positiveOutcome: 'Score <26', notes: 'Screens for mild cognitive impairment; max score 30' },
    { id: 'mmse', name: 'Mini-Mental State Examination (MMSE)', type: 'Cognitive Assessment', positiveOutcome: 'Score ≤23', notes: '24–30: Normal; 18–23: Mild impairment; 0–17: Severe impairment' },

    // Depression
    { id: 'phq9', name: 'PHQ-9', type: 'Depression', positiveOutcome: 'Score ≥10', notes: '0–4: Minimal; 5–9: Mild; 10–14: Moderate; 15–19: Moderately severe; 20–27: Severe' },
    { id: 'hamd', name: 'Hamilton Depression Rating Scale (HAM-D)', type: 'Depression', positiveOutcome: 'Score ≥17', notes: '0–7: Normal; 8–16: Mild; 17–23: Moderate; ≥24: Severe' },
    { id: 'bdi', name: 'Beck Depression Inventory (BDI-II)', type: 'Depression', positiveOutcome: 'Scores ≥20 indicate moderate to severe depressive symptoms', notes: '21-question self-report; each item scored 0–3 across depressive symptoms' },

    // Eating Disorder
    { id: 'scoff', name: 'SCOFF questionnaire', type: 'Eating Disorder', positiveOutcome: '≥2 positive answers', notes: 'May indicate presence of an eating disorder' },

    // Mania Severity Scale
    { id: 'ymrs', name: 'Young Mania Rating Scale (YMRS)', type: 'Mania Severity Scale', positiveOutcome: 'Score ≥20', notes: 'Assesses severity of manic symptoms' },

    // Mood Disorders
    { id: 'mdq', name: 'Mood Disorder Questionnaire (MDQ)', type: 'Mood Disorders', positiveOutcome: '≥7 “Yes” + Q1–2 yes + Q3 yes', notes: 'Screens for bipolar disorder; requires symptom clustering and impairment' },

    // Psychiatric
    { id: 'bprs', name: 'Brief Psychiatric Rating Scale (BPRS)', type: 'Psychiatric', positiveOutcome: 'Higher scores', notes: 'Measures psychotic and affective symptoms; monitors treatment response' },

    // Psychosis
    { id: 'prime', name: 'PRIME Screen', type: 'Psychosis', positiveOutcome: 'Any endorsed psychotic-like experiences', notes: 'Early detection of psychosis' },

    // PTSD
    { id: 'pcl5', name: 'PTSD Checklist (PCL-5)', type: 'PTSD', positiveOutcome: 'Score ≥33', notes: 'Suggests probable PTSD' },
    { id: 'pcptsd5', name: 'Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)', type: 'PTSD', positiveOutcome: 'Four or more yes responses suggest probable PTSD', notes: '5-item screen with trauma exposure question; assesses symptoms over past month' },

    // Stress
    { id: 'pss', name: 'Perceived Stress Scale (PSS)', type: 'Stress', positiveOutcome: 'Higher scores', notes: 'Indicates higher perceived stress' },

    // Substance Use
    { id: 'screener-addiction', name: 'screener – addiction', type: 'Substance Use', positiveOutcome: '', notes: '' },
    { id: 'audit', name: 'AUDIT', type: 'Substance Use', positiveOutcome: 'Score ≥8', notes: 'Indicates hazardous or harmful alcohol use' },
    { id: 'dast10', name: 'DAST-10', type: 'Substance Use', positiveOutcome: 'Score ≥3', notes: 'Suggests moderate to severe drug problems' },

    // Suicide Risk
    { id: 'cssrs', name: 'Columbia-Suicide Severity Rating Scale (C-SSRS)', type: 'Suicide Risk', positiveOutcome: 'Any suicidal ideation or behavior', notes: 'Comprehensive suicide risk assessment' },

    // Withdrawal
    { id: 'ciwa-ar', name: 'Clinical Institute Withdrawal Assessment for Alcohol (CIWA-Ar)', type: 'Withdrawal', positiveOutcome: 'Score ≥10', notes: 'Assesses alcohol withdrawal severity; guides medication dosing' }
];

const SCREENER_INDEX = SCREENER_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const SAFETY_RISK_ITEMS = [
    { id: 'risk-elder-abuse', name: 'Elder Abuse', category: 'Abuse Risk', description: 'Risk of mistreatment or neglect of an elderly individual.', generalPsych: true },
    { id: 'risk-access-drugs', name: 'Access to Drugs', category: 'Access Risk', description: 'Client retains ready access to illicit or non-prescribed substances.', generalPsych: false },
    { id: 'risk-wandering', name: 'Wandering/Disorientation', category: 'Cognitive Risk', description: 'Disorientation or wandering behavior that endangers safety.', generalPsych: true },
    { id: 'risk-falls-cognitive', name: 'Falls Risk due to Cognitive Impairment', category: 'Cognitive Risk', description: 'Elevated fall risk related to cognitive impairment.', generalPsych: true },
    { id: 'risk-medication-management', name: 'Medication Management', category: 'Compliance Risk', description: 'Complex regimen or adherence barriers requiring oversight.', generalPsych: true },
    { id: 'risk-nonadherence', name: 'Nonadherence to Medication', category: 'Compliance Risk', description: 'Pattern of missing or refusing prescribed medications.', generalPsych: true },
    { id: 'risk-environmental', name: 'Environmental Risks', category: 'Environmental Risk', description: 'Unsafe living environment or unstable social situation.', generalPsych: true },
    { id: 'risk-overdose', name: 'Overdose', category: 'Health Risk', description: 'History or risk of non-fatal overdose requiring monitoring.', generalPsych: false },
    { id: 'risk-relapse', name: 'Substance Use Relapse', category: 'Health Risk', description: 'Heightened probability of returning to substance use.', generalPsych: false },
    { id: 'risk-withdrawal', name: 'Withdrawal Complications', category: 'Health Risk', description: 'Medical instability due to acute withdrawal.', generalPsych: false },
    { id: 'risk-psychiatry', name: 'Safety risk – Psychiatry', category: 'Mental Health Concerns', description: 'Psychiatric safety risk requiring monitoring.', generalPsych: true },
    { id: 'risk-mh-comorbidities', name: 'Mental Health Comorbidities', category: 'Mental Health Risk', description: 'Multiple co-occurring psychiatric diagnoses complicating care.', generalPsych: true },
    { id: 'risk-housing', name: 'Housing insecurity', category: 'Psychological Stressors', description: 'Unstable or temporary housing arrangement.', generalPsych: true },
    { id: 'risk-suicidal-ideation', name: 'Suicidal Ideation', category: 'Self-Harm Risk', description: 'Active or recent thoughts of suicide.', generalPsych: true },
    { id: 'risk-suicide-attempt', name: 'Suicide Attempt', category: 'Self-Harm Risk', description: 'History of suicide attempt(s) impacting current safety planning.', generalPsych: true },
    { id: 'risk-self-harm', name: 'Self-Harm', category: 'Self-Harm Risk', description: 'Non-suicidal self-injury or related behaviors.', generalPsych: true },
    { id: 'risk-self-neglect', name: 'Self-Neglect', category: 'Self-Harm Risk', description: 'Failure to meet basic needs, creating safety concerns.', generalPsych: true },
    { id: 'risk-financial-employment', name: 'Financial Stability and Employment', category: 'Socioeconomic Risk', description: 'Loss of income or employment jeopardizing stability.', generalPsych: true },
    { id: 'risk-addiction', name: 'Safety risk – Addiction', category: 'Substance Use Risks', description: 'Addiction-related safety risk requiring monitoring.', generalPsych: false },
    { id: 'risk-aggressive', name: 'Aggressive Behaviors', category: 'Violence Risk', description: 'Physical aggression or violent outbursts requiring monitoring.', generalPsych: true },
    { id: 'risk-psychosis-aggression', name: 'Psychosis-Induced Aggression', category: 'Violence Risk', description: 'Aggression arising from psychosis requiring close supervision.', generalPsych: true }
];

const SAFETY_RISK_INDEX = SAFETY_RISK_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

export {
    MEDICATION_ITEMS,
    MEDICATION_INDEX,
    SUBSTANCE_ITEMS,
    SUBSTANCE_INDEX,
    SCREENER_ITEMS,
    SCREENER_INDEX,
    SAFETY_RISK_ITEMS,
    SAFETY_RISK_INDEX
};