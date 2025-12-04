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
    { id: 'sub-alcohol', name: 'Alcohol', category: 'Alcohol', description: 'A widely consumed depressant found in beverages like beer, wine, and spirits, known for its effects on mood and behavior.' },
    { id: 'sub-flower', name: 'Flower', category: 'Marijuana (THC)', description: 'The dried buds of the cannabis plant, typically smoked.' },
    { id: 'sub-concentrates', name: 'Concentrates (Dabs)', category: 'Marijuana (THC)', description: 'Highly concentrated THC extracted from cannabis, typically vaporized or dabbed.' },
    { id: 'sub-edibles', name: 'Edibles', category: 'Marijuana (THC)', description: 'Food products infused with cannabis extracts, ingested orally.' },
    { id: 'sub-tinctures', name: 'Tinctures', category: 'Marijuana (THC)', description: 'Liquid cannabis extracts taken sublingually.' },
    { id: 'sub-vapes-thc', name: 'Vapes (THC)', category: 'Marijuana (THC)', description: 'Cannabis oil or distillate used in vaporizing devices.' },
    { id: 'sub-cigarettes', name: 'Cigarettes', category: 'Nicotine', description: 'Found in tobacco products like cigarettes; an addictive stimulant.' },
    { id: 'sub-vapes-nic', name: 'Vapes (Nicotine)', category: 'Nicotine', description: 'Found in electronic vaping devices; an addictive stimulant.' },
    { id: 'sub-heroin', name: 'Heroin', category: 'Opioids', description: 'An opioid derived from morphine with high addiction potential.' },
    { id: 'sub-fentanyl', name: 'Fentanyl', category: 'Opioids', description: 'A synthetic opioid far more potent than heroin or morphine.' },
    { id: 'sub-rx-pain', name: 'Prescription Pain Killers', category: 'Opioids', description: 'Includes oxycodone, hydrocodone, morphine, and related opioids.' },
    { id: 'sub-cocaine', name: 'Cocaine', category: 'Stimulants', description: 'Powerful stimulant derived from coca leaves, commonly snorted or injected.' },
    { id: 'sub-meth', name: 'Methamphetamine', category: 'Stimulants', description: 'Highly addictive stimulant affecting the central nervous system.' },
    { id: 'sub-benzos', name: 'Benzodiazepine', category: 'Sedatives', description: 'Sedatives prescribed for anxiety, insomnia, and other conditions (e.g., Valium, Xanax).' },
    { id: 'sub-ghb', name: 'GHB', category: 'Sedatives', description: 'Central nervous system depressant used recreationally for sedative effects.' },
    { id: 'sub-mdma', name: 'MDMA (Ecstasy)', category: 'Hallucinogens', description: 'Synthetic drug with stimulant and hallucinogenic properties (ecstasy/molly).' },
    { id: 'sub-pcp', name: 'PCP', category: 'Hallucinogens', description: 'Dissociative hallucinogenic drug also known as phencyclidine or angel dust.' },
    { id: 'sub-psilocybin', name: 'Psilocybin', category: 'Hallucinogens', description: 'Naturally occurring hallucinogen found in certain mushrooms.' },
    { id: 'sub-mescaline', name: 'Mescaline', category: 'Hallucinogens', description: 'Hallucinogenic compound derived from the peyote cactus.' },
    { id: 'sub-synth-cannabinoids', name: 'Synthetic Cannabinoids', category: 'Synthetics', description: 'Man-made chemicals mimicking THC (e.g., K2, Spice).' },
    { id: 'sub-synth-cathinones', name: 'Synthetic Cathinones', category: 'Synthetics', description: 'Stimulant drugs often found in bath salts, similar to amphetamines.' },
    { id: 'sub-ketamine', name: 'Ketamine', category: 'Synthetics', description: 'Dissociative anesthetic used medically and recreationally with hallucinogenic effects.' }
];

const SUBSTANCE_INDEX = SUBSTANCE_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const SCREENER_ITEMS = [
    { id: 'scoff', name: 'SCOFF questionnaire', type: 'Eating Disorder', positiveOutcome: 'Screens for symptoms of eating disorders', notes: 'A positive score may indicate the presence of an eating disorder' },
    { id: 'phq9', name: 'PHQ-9', type: 'Depression', positiveOutcome: 'Indicates severity of depressive symptoms', notes: 'Score interpretation: 0-4: Minimal depression; 5-9: Mild depression; 10-14: Moderate depression; 15-19: Moderately severe depression; 20-27: Severe depression' },
    { id: 'gad7', name: 'GAD-7', type: 'Anxiety', positiveOutcome: 'Assesses severity of generalized anxiety symptoms', notes: 'Score interpretation: 0-4: Minimal anxiety; 5-9: Mild anxiety; 10-14: Moderate anxiety; 15-21: Severe anxiety' },
    { id: 'pss', name: 'Perceived Stress Scale (PSS)', type: 'Stress', positiveOutcome: 'Measures perceived stress levels', notes: 'Higher scores indicate higher perceived stress levels' },
    { id: 'pcl5', name: 'PTSD Checklist (PCL-5)', type: 'Trauma', positiveOutcome: 'Screens for symptoms of post-traumatic stress', notes: 'Used to assess PTSD symptoms; scoring system varies based on administration' },
    { id: 'audit', name: 'AUDIT', type: 'Substance Use', positiveOutcome: 'Identifies alcohol use patterns and related problems', notes: 'Higher scores indicate higher levels of alcohol use and related problems' },
    { id: 'dast10', name: 'DAST-10', type: 'Substance Use', positiveOutcome: 'Screens for drug abuse or dependence', notes: 'Higher scores indicate higher likelihood of drug abuse or dependence' },
    { id: 'cssrs', name: 'Columbia-Suicide Severity Rating Scale (C-SSRS)', type: 'Suicide Risk', positiveOutcome: 'Assesses suicide risk and severity of suicidal ideation', notes: 'Comprehensive tool for suicide risk assessment' },
    { id: 'prime', name: 'PRIME Screen', type: 'Psychosis', positiveOutcome: 'Screens for early signs of psychosis', notes: 'Used for early detection of psychosis; assesses symptoms such as hallucinations and delusions' },
    { id: 'k10', name: 'Kessler Psychological Distress Scale (K10)', type: 'Psychological Distress', positiveOutcome: 'High total score indicates high distress and need for evaluation', notes: '10 items scored 1–5; total score 10-50; measures non-specific psychological distress' },
    { id: 'pcptsd5', name: 'Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)', type: 'PTSD', positiveOutcome: 'Four or more yes responses suggest probable PTSD', notes: '5-item screen with trauma exposure question; assesses symptoms over past month' },
    { id: 'mdq', name: 'Mood Disorder Questionnaire (MDQ)', type: 'Bipolar Disorder', positiveOutcome: 'Seven+ “yes” responses plus criteria indicate possible bipolar disorder', notes: '13 yes/no items plus co-occurrence + impairment questions; ~5 minutes' },
    { id: 'asrs', name: 'Adult ADHD Self-Report Scale (ASRS v1.1)', type: 'ADHD', positiveOutcome: 'Four+ marks in shaded boxes suggest ADHD symptoms', notes: '18 items; Part A (6 items) most predictive; Part B provides additional info' },
    { id: 'bdi', name: 'Beck Depression Inventory (BDI-II)', type: 'Depression', positiveOutcome: 'Scores ≥20 indicate moderate to severe depressive symptoms', notes: '21-question self-report; each item scored 0–3 across depressive symptoms' },
    { id: 'dass21', name: 'Depression Anxiety Stress Scale-21 (DASS-21)', type: 'Depression/Anxiety/Stress', positiveOutcome: 'Elevated subscale scores indicate moderate to severe symptoms', notes: '21-item measure generating three subscale scores (0–3 per item)' },
    { id: 'hads', name: 'Hospital Anxiety and Depression Scale (HADS)', type: 'Depression/Anxiety', positiveOutcome: 'Scores >8 on HADS-A or HADS-D indicate possible anxiety/depression', notes: '14-item questionnaire with two 7-item subscales; items rated 0–3' },
    { id: 'bai', name: 'Beck Anxiety Inventory (BAI)', type: 'Anxiety', positiveOutcome: 'Scores ≥16 indicate moderate to severe anxiety', notes: '21-question inventory measuring physical/cognitive anxiety symptoms' }
];

const SCREENER_INDEX = SCREENER_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

const SAFETY_RISK_ITEMS = [
    { id: 'risk-access-drugs', name: 'Access to Drugs', category: 'Substance Use Risks', description: 'Client retains ready access to illicit or non-prescribed substances.', generalPsych: false },
    { id: 'risk-overdose', name: 'Overdose', category: 'Substance Use Risks', description: 'History or risk of non-fatal overdose requiring monitoring.', generalPsych: false },
    { id: 'risk-relapse', name: 'Substance Use Relapse', category: 'Substance Use Risks', description: 'Heightened probability of returning to substance use.', generalPsych: false },
    { id: 'risk-withdrawal', name: 'Withdrawal Complications', category: 'Medical/Health Complications', description: 'Medical instability due to acute withdrawal.', generalPsych: false },
    { id: 'risk-med-management', name: 'Medication Management', category: 'Medical/Health Complications', description: 'Complex regimen or adherence barriers requiring oversight.', generalPsych: true },
    { id: 'risk-suicidal-ideation', name: 'Suicidal Ideation', category: 'Mental Health Concerns', description: 'Active or recent thoughts of suicide.', generalPsych: true },
    { id: 'risk-suicide-attempt', name: 'Suicide Attempt', category: 'Mental Health Concerns', description: 'History of suicide attempt(s) impacting current safety planning.', generalPsych: true },
    { id: 'risk-self-harm', name: 'Self-Harm', category: 'Mental Health Concerns', description: 'Non-suicidal self-injury or related behaviors.', generalPsych: true },
    { id: 'risk-mh-comorbidities', name: 'Mental Health Comorbidities', category: 'Mental Health Concerns', description: 'Multiple co-occurring psychiatric diagnoses complicating care.', generalPsych: true },
    { id: 'risk-aggressive', name: 'Aggressive Behaviors', category: 'Behavioral Concerns', description: 'Physical aggression or violent outbursts requiring monitoring.', generalPsych: true },
    { id: 'risk-environmental', name: 'Environmental Risks', category: 'Environmental/Social Risks', description: 'Unsafe living environment or unstable social situation.', generalPsych: true },
    { id: 'risk-financial-employment', name: 'Financial Stability and Employment', category: 'Socioeconomic Concerns', description: 'Loss of income or employment jeopardizing stability.', generalPsych: true },
    { id: 'risk-housing', name: 'Housing insecurity', category: 'Psychosocial Stressors', description: 'Unstable or temporary housing arrangement.', generalPsych: true },
    { id: 'risk-food', name: 'Food insecurity', category: 'Psychosocial Stressors', description: 'Limited access to adequate nutrition.', generalPsych: true },
    { id: 'risk-caregiver', name: 'Caregiver burden', category: 'Psychosocial Stressors', description: 'Care responsibilities exceed available supports.', generalPsych: true },
    { id: 'risk-legal', name: 'Legal issues', category: 'Psychosocial Stressors', description: 'Active legal matters impacting treatment engagement.', generalPsych: true },
    { id: 'risk-job', name: 'Job/school risk', category: 'Psychosocial Stressors', description: 'Threatened employment or academic standing.', generalPsych: true },
    { id: 'risk-relationship', name: 'Relationship conflict', category: 'Psychosocial Stressors', description: 'High-conflict relationships increasing risk.', generalPsych: true },
    { id: 'risk-limited-supports', name: 'Limited supports', category: 'Psychosocial Stressors', description: 'Few reliable caregivers or social supports.', generalPsych: true },
    { id: 'risk-financial-stress', name: 'Financial stress', category: 'Psychosocial Stressors', description: 'Significant financial strain affecting stability.', generalPsych: true },
    { id: 'risk-firearms-unlocked', name: 'Firearms - Unlocked', category: 'Access to Means', description: 'Unlocked firearms accessible in the home.', generalPsych: true },
    { id: 'risk-firearms-locked', name: 'Firearms - Locked', category: 'Access to Means', description: 'Locked firearms requiring continued monitoring.', generalPsych: true },
    { id: 'risk-med-supply', name: 'Large medication supply', category: 'Access to Means', description: 'Excess medication quantities posing overdose risk.', generalPsych: true },
    { id: 'risk-ligature', name: 'Ligature risk', category: 'Access to Means', description: 'Presence of ligatures or choke points in the environment.', generalPsych: true },
    { id: 'risk-homicidal-ideation', name: 'Homicidal Ideation', category: 'Homicidal Ideation', description: 'Thoughts of harming others requiring monitoring.', generalPsych: true }
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