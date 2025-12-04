public with sharing class GPCaseService {
    public class PcqtOptionDTO {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
    }
    private static final List<String> DEFAULT_PCQT_OPTIONS = new List<String>{
        'Diagnosis clarification',
        'Medication strategy',
        'Safety risk assessment',
        'Psychosis evaluation',
        'Mania/hypomania evaluation',
        'Substance use/withdrawal management',
        'Medical contributor/clearance guidance',
        'Therapy/referral options',
        'Treatment-resistant depression strategy',
        'ADHD evaluation',
        'Anxiety differential',
        'Sleep disturbance management',
        'PTSD/trauma evaluation',
        'Disposition guidance (OP vs ED)',
        'Legal/safety (IPV, abuse, duty to warn)',
        'Cognitive change/delirium',
        'Perinatal/postpartum concerns',
        'Child/adolescent concern',
        'Capacity assessment'
    };
    private static final Map<String, Schema.SObjectField> CASE_FIELD_MAP = Case.SObjectType.getDescribe().fields.getMap();

    //
    // ======================================================
    // 1) AUTHORITATIVE CASE RESOLVER (REQUIRED BY WIZARD)
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static Id getAuthoritativeCaseId(Id recordId) {
        if (recordId == null) return null;

        Case c = [
            SELECT Id, ParentId, RecordType.DeveloperName
            FROM Case
            WHERE Id = :recordId
            LIMIT 1
        ];

        // If this Case is already the parent Patient Case → return itself
        if (c.ParentId == null || c.RecordType.DeveloperName == 'Patient_Case') {
            return c.Id;
        }

        // Otherwise return the parent Case
        return c.ParentId;
    }

    //
    // ======================================================
    // 1b) PCQT OPTION LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<PcqtOptionDTO> getPcqtOptions(String caseType) {
        Schema.SObjectType pcqtDescribe = Schema.getGlobalDescribe().get('PCQT__c');
        if (pcqtDescribe == null) {
            return toPcqtOptions(DEFAULT_PCQT_OPTIONS);
        }

        String normalized = String.isBlank(caseType) ? 'general' : caseType.toLowerCase();
        String filterField;
        if (normalized.contains('addiction')) {
            filterField = 'Addiction_Services__c';
        } else if (normalized.contains('all')) {
            filterField = null;
        } else {
            filterField = 'General_Psychiatry__c';
        }

        String baseQuery = 'SELECT Id, Name FROM PCQT__c';
        if (filterField != null) {
            baseQuery += ' WHERE ' + filterField + ' = true';
        }
        baseQuery += ' ORDER BY Name ASC';

        List<SObject> records = Database.query(baseQuery);
        List<PcqtOptionDTO> options = new List<PcqtOptionDTO>();
        for (SObject row : records) {
            PcqtOptionDTO dto = new PcqtOptionDTO();
            String nameValue = (String)row.get('Name');
            dto.label = nameValue;
            dto.value = nameValue;
            options.add(dto);
        }

        if (options.isEmpty()) {
            return toPcqtOptions(DEFAULT_PCQT_OPTIONS);
        }

        return options;
    }
    private static List<PcqtOptionDTO> toPcqtOptions(List<String> labels) {
        List<PcqtOptionDTO> options = new List<PcqtOptionDTO>();
        for (String label : labels) {
            PcqtOptionDTO dto = new PcqtOptionDTO();
            dto.label = label;
            dto.value = label;
            options.add(dto);
        }
        return options;
    }



    //
    // ======================================================
    // 2) CREATE CASE (USED FOR STEP 1 OF WIZARD)
    // ======================================================
    //
    @AuraEnabled
    public static Id createCase(Map<String, Object> stepData) {
        Case c = new Case();

        if (stepData != null) {
            if (stepData.containsKey('Subject')) 
                c.Subject = (String)stepData.get('Subject');

            if (stepData.containsKey('Description')) 
                c.Description = (String)stepData.get('Description');

            if (stepData.containsKey('Priority')) 
                c.Priority = (String)stepData.get('Priority');

            setLookupFieldSafely(c, 'Provider__c', stepData.get('Provider__c'));
            setLookupFieldSafely(c, 'AccountId', stepData.get('AccountId'));
            setLookupFieldSafely(c, 'ContactId', stepData.get('ContactId'));
        }

        c.Status = 'New';
        c.OwnerId = UserInfo.getUserId();
        Map<String, Schema.SObjectField> caseFields = Schema.SObjectType.Case.fields.getMap();
        if (caseFields.containsKey('Case_Type__c')) {
            c.put('Case_Type__c', 'General Psychiatry');
        }

        insert c;
        return c.Id;
    }



    //
    // ======================================================
    // 3) SAVE STEP DATA ON CASE
    // ======================================================
    //
    @AuraEnabled
    public static void saveStepData(Id caseId, Map<String, Object> stepData) {
        if (caseId == null || stepData == null) return;

        Case c = [
            SELECT Id 
            FROM Case 
            WHERE Id = :caseId 
            LIMIT 1
        ];

        Map<String, Schema.SObjectField> fmap = Schema.SObjectType.Case.fields.getMap();

        for (String key : stepData.keySet()) {
            if (!fmap.containsKey(key)) continue;

            Schema.DescribeFieldResult describe = fmap.get(key).getDescribe();
            Object value = stepData.get(key);
            System.debug('saveStepData => field: ' + key + ' type: ' + describe.getType() + ' value: ' + value);

            Boolean isNullish = value == null || (value instanceof String && String.valueOf(value).trim() == '');
            if (isNullish) {
                if (describe.getType() == Schema.DisplayType.Boolean) {
                    continue;
                }
                c.put(key, null);
                continue;
            }

            if (describe.getType() == Schema.DisplayType.Boolean) {
                if (value instanceof Boolean) {
                    c.put(key, value);
                } else {
                    c.put(key, Boolean.valueOf(String.valueOf(value)));
                }
            } else if (describe.getType() == Schema.DisplayType.String ||
                       describe.getType() == Schema.DisplayType.TextArea ||
                       describe.getType() == Schema.DisplayType.Picklist ||
                       describe.getType() == Schema.DisplayType.MultiPicklist ||
                       describe.getType() == Schema.DisplayType.Phone ||
                       describe.getType() == Schema.DisplayType.Email ||
                       describe.getType() == Schema.DisplayType.Url) {
                c.put(key, String.valueOf(value));
            } else if (describe.getType() == Schema.DisplayType.Date && value instanceof String) {
                c.put(key, Date.valueOf((String)value));
            } else if (describe.getType() == Schema.DisplayType.DateTime && value instanceof String) {
                c.put(key, DateTime.valueOf((String)value));
            } else {
                c.put(key, value);
            }
        }
        update c;
    }



    //
    // ======================================================
    // 4) GET CASE DETAILS
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static Case getCase(Id caseId) {
        return [
            SELECT Id, Subject, Description, Priority, Status
            FROM Case 
            WHERE Id = :caseId
            LIMIT 1
        ];
    }



    //
    // ======================================================
    // 4b) LOAD CASE + RELATED COLLECTIONS
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCaseFullData(Id caseId) {
        Map<String, Object> payload = createEmptyFormPayload();
        if (caseId == null) {
            return payload;
        }

        Id parentCaseId = resolveCaseId(caseId);
        Case caseRecord = [
            SELECT Id, Subject, Priority, Description,
                   Primary_Clinical_Question_Types__c, Impaired_Domains__c, Symptom_Onset_Date__c,
                   Impairment_Level__c, Course__c, Abrupt_Change__c, Other_Symptoms__c,
                   Top_Symptoms__c,
                   Psych_Hospitalizations__c, ED_Visits_Count__c,
                   Self_Harm_History__c, Other_Prior_Diagnosis__c, Prior_Diagnoses__c,
                   Suicidal_Ideation__c, Last_Attempt_Date__c, Protective_Factors__c,
                   Suicidal_Intent__c, Past_Suicide_Attempts__c, Access_to_Means__c,
                   Homicidal_Ideation__c, Violence_Recent__c, Weapons_Access__c, Violence_Details__c,
                   Psychosis_Symptoms__c, Mania_Symptoms__c, Medical_Red_Flags__c,
                   Psychosis_Notes__c, Medical_Notes__c,
                   Recent_Trauma__c, Dependent_Safety_Concern__c, IPV_Concern__c,
                   Family_History_Notes__c, Family_History__c,
                   Home_Safety__c, Lethal_Means_Access__c, Means_Safety_Plan__c,
                   Safety_Notes__c, Reliable_Supports__c, Cost_Coverage_Issues__c,
                   Supports_Notes__c, Psychosocial_Stressors__c,
                   Orientation__c, Cognition_Notes__c
            FROM Case
            WHERE Id = :parentCaseId
            LIMIT 1
        ];

        payload.put('basics', mapCaseFields(caseRecord, new List<String>{
            'Subject', 'Priority', 'Description'
        }));
        payload.put('presenting', mapCaseFields(caseRecord, new List<String>{
            'Primary_Clinical_Question_Types__c',
            'Impaired_Domains__c',
            'Symptom_Onset_Date__c',
            'Impairment_Level__c',
            'Course__c',
            'Abrupt_Change__c',
            'Other_Symptoms__c',
            'Top_Symptoms__c'
        }));
        payload.put('priorDx', mapCaseFields(caseRecord, new List<String>{
            'Psych_Hospitalizations__c',
            'ED_Visits_Count__c',
            'Self_Harm_History__c',
            'Other_Prior_Diagnosis__c',
            'Prior_Diagnoses__c'
        }));
        payload.put('suicide', mapCaseFields(caseRecord, new List<String>{
            'Suicidal_Ideation__c',
            'Last_Attempt_Date__c',
            'Protective_Factors__c',
            'Suicidal_Intent__c',
            'Past_Suicide_Attempts__c',
            'Access_to_Means__c'
        }));
        payload.put('violence', mapCaseFields(caseRecord, new List<String>{
            'Homicidal_Ideation__c',
            'Violence_Recent__c',
            'Weapons_Access__c',
            'Violence_Details__c'
        }));
        payload.put('psychosisMania', mapCaseFields(caseRecord, new List<String>{
            'Psychosis_Symptoms__c',
            'Mania_Symptoms__c',
            'Medical_Red_Flags__c',
            'Psychosis_Notes__c',
            'Medical_Notes__c'
        }));
        payload.put('familyTrauma', mapCaseFields(caseRecord, new List<String>{
            'Recent_Trauma__c',
            'Dependent_Safety_Concern__c',
            'IPV_Concern__c',
            'Family_History_Notes__c',
            'Family_History__c'
        }));
        payload.put('homeSafety', mapCaseFields(caseRecord, new List<String>{
            'Home_Safety__c',
            'Lethal_Means_Access__c',
            'Means_Safety_Plan__c',
            'Safety_Notes__c',
            'Reliable_Supports__c',
            'Cost_Coverage_Issues__c',
            'Supports_Notes__c',
            'Psychosocial_Stressors__c'
        }));
        payload.put('cognition', mapCaseFields(caseRecord, new List<String>{
            'Orientation__c',
            'Cognition_Notes__c'
        }));

        payload.put('medications', loadMedicationsForCase(parentCaseId));
        payload.put('substances', loadSubstancesForCase(parentCaseId));
        payload.put('screeners', loadScreenersForCase(parentCaseId));
        payload.put('concerns', loadConcernsForCase(parentCaseId));
        payload.put('safetyRisks', loadSafetyRisksForCase(parentCaseId));

        return payload;
    }



    //
    // ======================================================
    // 5) BULK SAVE HELPERS FOR RELATED COLLECTIONS
    // ======================================================
    //
    @AuraEnabled
    public static void saveMedications(Id caseId, List<MedicationInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        Map<String, Schema.SObjectField> caseFields = Case.SObjectType.getDescribe().fields.getMap();
        Boolean hasPatientField = caseFields.containsKey('Patient__c');
        String query = 'SELECT Id' + (hasPatientField ? ', Patient__c' : '') + ' FROM Case WHERE Id = :parentCaseId LIMIT 1';
        Case parentCase = (Case)Database.query(query);
        Id patientId = hasPatientField ? (Id)parentCase.get('Patient__c') : null;
        deleteExistingMedications(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveMedications => items: ' + JSON.serialize(items));
        if (items == null || items.isEmpty()) {
            System.debug(LoggingLevel.ERROR, 'saveMedications error: payload is null or empty.');
            return;
        }

        Map<String, Id> medIds = fetchCatalogIds('Medication__c', collectNamesFromMedications(items));
        List<Patient_Medication__c> toInsert = new List<Patient_Medication__c>();
        for (MedicationInput item : items) {
            if (String.isBlank(item.catalogName)) {
                System.debug(LoggingLevel.ERROR, 'saveMedications item skipped because catalogName is blank: ' + JSON.serialize(item));
                continue;
            }
            Id medId = medIds.get(item.catalogName.toLowerCase());
            if (medId == null) {
                medId = ensureCatalogRecord('Medication__c', item.catalogName, new Map<String, Object>{
                    'Category__c' => item.catalogCategory
                });
            }
            Patient_Medication__c record = new Patient_Medication__c();
            record.Case__c = parentCaseId;
            record.Medication_List__c = medId;
            if (patientId != null && Patient_Medication__c.SObjectType.getDescribe().fields.getMap().containsKey('Patient__c')) {
                record.put('Patient__c', patientId);
            }
            record.Medication_Changes__c = item.action;
            record.Frequency__c = item.frequency;
            record.Dosing_Unit__c = item.unit;
            record.Current_Medication__c = item.current;
            record.Allergy__c = item.allergy;
            record.Notes__c = item.notes;
            if (!String.isBlank(item.amount)) {
                try {
                    record.Amount__c = Decimal.valueOf(item.amount);
                } catch (Exception ex) {
                    throw new AuraHandledException('Invalid amount for medication "' + item.catalogName + '".');
                }
            }
            toInsert.add(record);
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }
    }

    @AuraEnabled
    public static void saveSubstances(Id caseId, List<SubstanceInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        deleteExistingSubstances(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveSubstances => items: ' + JSON.serialize(items));
        if (items == null || items.isEmpty()) {
            return;
        }
        Map<String, Id> subs = fetchCatalogIds('Substance_List__c', collectNamesFromSubstances(items));
        List<Patient_Substance__c> toInsert = new List<Patient_Substance__c>();
        for (SubstanceInput item : items) {
            if (String.isBlank(item.catalogName)) {
                continue;
            }
            Id catalogId = subs.get(item.catalogName.toLowerCase());
            if (catalogId == null) {
                catalogId = ensureCatalogRecord('Substance_List__c', item.catalogName, new Map<String, Object>{
                    'Substance_Category__c' => item.catalogCategory
                });
            }
            Patient_Substance__c record = new Patient_Substance__c();
            record.Case__c = parentCaseId;
            record.Substance_Listing__c = catalogId;
            record.Frequency_of_Substance_Use__c = item.frequency;
            record.Current_Substance__c = item.current;
            record.Notes_new__c = item.notes;
            toInsert.add(record);
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }
    }

    @AuraEnabled
    public static void saveScreeners(Id caseId, List<ScreenerInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        deleteExistingScreeners(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveScreeners => items: ' + JSON.serialize(items));
        if (items == null || items.isEmpty()) {
            return;
        }
        Map<String, Id> screeners = fetchCatalogIds('Screener__c', collectNamesFromScreeners(items));
        List<Patient_Screener__c> toInsert = new List<Patient_Screener__c>();
        for (ScreenerInput item : items) {
            if (String.isBlank(item.catalogName)) {
                continue;
            }
            Id catalogId = screeners.get(item.catalogName.toLowerCase());
            if (catalogId == null) {
                catalogId = ensureCatalogRecord('Screener__c', item.catalogName, new Map<String, Object>{
                    'Screener_Type__c' => item.catalogType
                });
            }
            Patient_Screener__c record = new Patient_Screener__c();
            record.Case__c = parentCaseId;
            record.Screener__c = catalogId;
            if (!String.isBlank(item.screenedDate)) {
                try {
                    record.Aproximate_Date_Screened__c = Date.valueOf(item.screenedDate);
                } catch (Exception ex) {
                    throw new AuraHandledException('Invalid date for screener "' + item.catalogName + '".');
                }
            }
            record.Score__c = item.score;
            record.Positive_Outcome__c = item.positive;
            record.Notes_new__c = item.notes;
            toInsert.add(record);
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }
    }

    @AuraEnabled
    public static void saveConcerns(Id caseId, List<ConcernInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        deleteExistingConcerns(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveConcerns => items: ' + JSON.serialize(items));
        if (items == null || items.isEmpty()) {
            return;
        }
        Map<String, Id> concerns = fetchCatalogIds('Concern_List__c', collectNamesFromConcerns(items));
        List<Patient_Concern__c> toInsert = new List<Patient_Concern__c>();
        for (ConcernInput item : items) {
            if (String.isBlank(item.label)) {
                continue;
            }
            Id concernId = concerns.get(item.label.toLowerCase());
            if (concernId == null) {
                concernId = ensureCatalogRecord('Concern_List__c', item.label, new Map<String, Object>{
                    'Category__c' => item.category
                });
            }
            Patient_Concern__c record = new Patient_Concern__c();
            record.Case__c = parentCaseId;
            record.Concern__c = concernId;
            record.Notes_new__c = item.notes;
            toInsert.add(record);
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }
    }

    @AuraEnabled
    public static void saveSafetyRisks(Id caseId, List<SafetyRiskInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        deleteExistingSafetyRisks(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveSafetyRisks => items: ' + JSON.serialize(items));
        if (items == null || items.isEmpty()) {
            return;
        }
        Map<String, Id> risks = fetchCatalogIds('Safety_Risk__c', collectNamesFromSafetyRisks(items));
        List<Patient_Safety_Risk__c> toInsert = new List<Patient_Safety_Risk__c>();
        for (SafetyRiskInput item : items) {
            if (String.isBlank(item.catalogName)) {
                continue;
            }
            Id riskId = risks.get(item.catalogName.toLowerCase());
            if (riskId == null) {
                riskId = ensureCatalogRecord('Safety_Risk__c', item.catalogName, new Map<String, Object>{
                    'Category__c' => item.catalogCategory
                });
            }
            Patient_Safety_Risk__c record = new Patient_Safety_Risk__c();
            record.Case__c = parentCaseId;
            record.Safety_Risk__c = riskId;
            record.Recent__c = item.recent;
            record.Historical__c = item.historical;
            record.Notes_new__c = item.notes;
            toInsert.add(record);
        }
        if (!toInsert.isEmpty()) {
            insert toInsert;
        }
    }



    //
    // ======================================================
    // 6) GENERIC CHILD UPSERT (USED BY WIDGETS)
    // ======================================================
    //
    @AuraEnabled
    public static Id upsertChild(String objectApiName, Map<String, Object> recordData, Id caseId) {

        if (String.isBlank(objectApiName))
            return null;

        Schema.SObjectType t = Schema.getGlobalDescribe().get(objectApiName);
        if (t == null)
            return null;

        SObject s = t.newSObject();

        // Autolink to Case__c if that field exists
        if (caseId != null) {
            if (s.getSObjectType().getDescribe().fields.getMap().containsKey('Case__c')) {
                s.put('Case__c', caseId);
            }
        }

        if (recordData != null) {
            for (String k : recordData.keySet()) {
                s.put(k, recordData.get(k));
            }
        }

        upsert s;
        return (Id)s.get('Id');
    }

    /* ------------------------------------------------------------
        PRIVATE HELPERS
    ------------------------------------------------------------ */
    private static Map<String, Object> createEmptyFormPayload() {
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('basics', new Map<String, Object>());
        payload.put('presenting', new Map<String, Object>());
        payload.put('priorDx', new Map<String, Object>());
        payload.put('suicide', new Map<String, Object>());
        payload.put('violence', new Map<String, Object>());
        payload.put('psychosisMania', new Map<String, Object>());
        payload.put('familyTrauma', new Map<String, Object>());
        payload.put('medicalFlags', new Map<String, Object>());
        payload.put('homeSafety', new Map<String, Object>());
        payload.put('cognition', new Map<String, Object>());
        payload.put('supports', new Map<String, Object>());
        payload.put('screeners', new List<Object>());
        payload.put('medications', new List<Object>());
        payload.put('substances', new List<Object>());
        payload.put('concerns', new List<Object>());
        payload.put('safetyRisks', new List<Object>());
        return payload;
    }

    private static Map<String, Object> mapCaseFields(Case source, List<String> fieldNames) {
        Map<String, Object> response = new Map<String, Object>();
        if (source == null || fieldNames == null) {
            return response;
        }
        for (String fieldName : fieldNames) {
            if (CASE_FIELD_MAP.containsKey(fieldName)) {
                response.put(fieldName, source.get(fieldName));
            }
        }
        return response;
    }

    private static List<Map<String, Object>> loadMedicationsForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        List<Patient_Medication__c> meds = [
            SELECT Id, Medication_List__c, Medication_List__r.Name, Medication_List__r.Category__c,
                   Medication_Changes__c, Frequency__c, Amount__c, Dosing_Unit__c,
                   Current_Medication__c, Allergy__c, Notes__c
            FROM Patient_Medication__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Medication__c med : meds) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', med.Medication_List__r != null ? med.Medication_List__r.Name : med.Medication_List__c);
            entry.put('catalogId', med.Medication_List__c);
            entry.put('catalogName', med.Medication_List__r != null ? med.Medication_List__r.Name : null);
            entry.put('catalogCategory', med.Medication_List__r != null ? (String)med.Medication_List__r.get('Category__c') : null);
            entry.put('action', med.Medication_Changes__c);
            entry.put('frequency', med.Frequency__c);
            entry.put('amount', med.Amount__c != null ? String.valueOf(med.Amount__c) : null);
            entry.put('unit', med.Dosing_Unit__c);
            entry.put('current', med.Current_Medication__c);
            entry.put('allergy', med.Allergy__c);
            entry.put('notes', med.Notes__c);
            results.add(entry);
        }
        return results;
    }

    private static List<Map<String, Object>> loadSubstancesForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        List<Patient_Substance__c> subs = [
            SELECT Id, Substance_Listing__c, Substance_Listing__r.Name, Substance_Listing__r.Substance_Category__c,
                   Frequency_of_Substance_Use__c, Current_Substance__c, Notes_new__c
            FROM Patient_Substance__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Substance__c sub : subs) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', sub.Substance_Listing__r != null ? sub.Substance_Listing__r.Name : sub.Substance_Listing__c);
            entry.put('catalogId', sub.Substance_Listing__c);
            entry.put('catalogName', sub.Substance_Listing__r != null ? sub.Substance_Listing__r.Name : null);
            entry.put('catalogCategory', sub.Substance_Listing__r != null ? (String)sub.Substance_Listing__r.get('Substance_Category__c') : null);
            entry.put('frequency', sub.Frequency_of_Substance_Use__c);
            entry.put('current', sub.Current_Substance__c);
            entry.put('notes', sub.Notes_new__c);
            results.add(entry);
        }
        return results;
    }

    private static List<Map<String, Object>> loadScreenersForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        List<Patient_Screener__c> screeners = [
            SELECT Id, Screener__c, Screener__r.Name, Screener__r.Screener_Type__c,
                   Aproximate_Date_Screened__c, Score__c, Positive_Outcome__c, Notes_new__c
            FROM Patient_Screener__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Screener__c scr : screeners) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', scr.Screener__r != null ? scr.Screener__r.Name : scr.Screener__c);
            entry.put('catalogId', scr.Screener__c);
            entry.put('catalogName', scr.Screener__r != null ? scr.Screener__r.Name : null);
            entry.put('catalogType', scr.Screener__r != null ? (String)scr.Screener__r.get('Screener_Type__c') : null);
            entry.put('date', scr.Aproximate_Date_Screened__c != null ? String.valueOf(scr.Aproximate_Date_Screened__c) : null);
            entry.put('score', scr.Score__c != null ? String.valueOf(scr.Score__c) : null);
            entry.put('positive', scr.Positive_Outcome__c);
            entry.put('notes', scr.Notes_new__c);
            results.add(entry);
        }
        return results;
    }

    private static List<Map<String, Object>> loadConcernsForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        List<Patient_Concern__c> concerns = [
            SELECT Id, Concern__c, Concern__r.Name, Concern__r.Category__c, Notes_new__c
            FROM Patient_Concern__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Concern__c concern : concerns) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', concern.Concern__c);
            entry.put('label', concern.Concern__r != null ? concern.Concern__r.Name : null);
            entry.put('category', concern.Concern__r != null ? (String)concern.Concern__r.get('Category__c') : null);
            entry.put('notes', concern.Notes_new__c);
            entry.put('source', 'manual');
            results.add(entry);
        }
        return results;
    }

    private static List<Map<String, Object>> loadSafetyRisksForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        List<Patient_Safety_Risk__c> risks = [
            SELECT Id, Safety_Risk__c, Safety_Risk__r.Name, Safety_Risk__r.Category__c,
                   Recent__c, Historical__c, Notes_new__c
            FROM Patient_Safety_Risk__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Safety_Risk__c risk : risks) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', risk.Safety_Risk__r != null ? risk.Safety_Risk__r.Name : risk.Safety_Risk__c);
            entry.put('catalogId', risk.Safety_Risk__c);
            entry.put('catalogName', risk.Safety_Risk__r != null ? risk.Safety_Risk__r.Name : null);
            entry.put('catalogCategory', risk.Safety_Risk__r != null ? (String)risk.Safety_Risk__r.get('Category__c') : null);
            entry.put('recent', risk.Recent__c);
            entry.put('historical', risk.Historical__c);
            entry.put('notes', risk.Notes_new__c);
            results.add(entry);
        }
        return results;
    }

    private static Id resolveCaseId(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Case Id is required.');
        }
        Id authoritative = getAuthoritativeCaseId(recordId);
        return authoritative != null ? authoritative : recordId;
    }

    private static void deleteExistingMedications(Id caseId) {
        List<Patient_Medication__c> existing = [
            SELECT Id FROM Patient_Medication__c WHERE Case__c = :caseId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }
    }

    private static void deleteExistingSubstances(Id caseId) {
        List<Patient_Substance__c> existing = [
            SELECT Id FROM Patient_Substance__c WHERE Case__c = :caseId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }
    }

    private static void deleteExistingScreeners(Id caseId) {
        List<Patient_Screener__c> existing = [
            SELECT Id FROM Patient_Screener__c WHERE Case__c = :caseId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }
    }

    private static void deleteExistingConcerns(Id caseId) {
        List<Patient_Concern__c> existing = [
            SELECT Id FROM Patient_Concern__c WHERE Case__c = :caseId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }
    }

    private static void deleteExistingSafetyRisks(Id caseId) {
        List<Patient_Safety_Risk__c> existing = [
            SELECT Id FROM Patient_Safety_Risk__c WHERE Case__c = :caseId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }
    }

    private static Map<String, Id> fetchCatalogIds(String objectApiName, Set<String> names) {
        Map<String, Id> results = new Map<String, Id>();
        if (String.isBlank(objectApiName) || names == null || names.isEmpty()) {
            return results;
        }
        String query = 'SELECT Id, Name FROM ' + objectApiName + ' WHERE Name IN :names';
        for (SObject row : Database.query(query)) {
            String name = (String)row.get('Name');
            if (!String.isBlank(name)) {
                results.put(name.toLowerCase(), (Id)row.get('Id'));
            }
        }
        return results;
    }

    private static Id ensureCatalogRecord(String objectApiName, String nameValue, Map<String, Object> extras) {
        if (String.isBlank(objectApiName) || String.isBlank(nameValue)) {
            return null;
        }
        SObjectType type = Schema.getGlobalDescribe().get(objectApiName);
        if (type == null) {
            return null;
        }
        SObject record = type.newSObject();
        record.put('Name', nameValue);
        if (extras != null) {
            for (String key : extras.keySet()) {
                record.put(key, extras.get(key));
            }
        }
        insert record;
        return (Id)record.get('Id');
    }

    private static Set<String> collectNamesFromMedications(List<MedicationInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (MedicationInput item : items) {
            if (!String.isBlank(item.catalogName)) {
                names.add(item.catalogName);
            }
        }
        return names;
    }

    private static Set<String> collectNamesFromSubstances(List<SubstanceInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (SubstanceInput item : items) {
            if (!String.isBlank(item.catalogName)) {
                names.add(item.catalogName);
            }
        }
        return names;
    }

    private static Set<String> collectNamesFromScreeners(List<ScreenerInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (ScreenerInput item : items) {
            if (!String.isBlank(item.catalogName)) {
                names.add(item.catalogName);
            }
        }
        return names;
    }

    private static Set<String> collectNamesFromConcerns(List<ConcernInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (ConcernInput item : items) {
            if (!String.isBlank(item.label)) {
                names.add(item.label);
            }
        }
        return names;
    }

    private static Set<String> collectNamesFromSafetyRisks(List<SafetyRiskInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (SafetyRiskInput item : items) {
            if (!String.isBlank(item.catalogName)) {
                names.add(item.catalogName);
            }
        }
        return names;
    }

    /* ------------------------------------------------------------
        DTO CLASSES
    ------------------------------------------------------------ */
    public class MedicationInput {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String catalogName { get; set; }
        @AuraEnabled public String catalogCategory { get; set; }
        @AuraEnabled public String action { get; set; }
        @AuraEnabled public String frequency { get; set; }
        @AuraEnabled public String amount { get; set; }
        @AuraEnabled public String unit { get; set; }
        @AuraEnabled public Boolean current { get; set; }
        @AuraEnabled public Boolean allergy { get; set; }
        @AuraEnabled public String notes { get; set; }
    }

    public class SubstanceInput {
        @AuraEnabled public String catalogName { get; set; }
        @AuraEnabled public String catalogCategory { get; set; }
        @AuraEnabled public String frequency { get; set; }
        @AuraEnabled public Boolean current { get; set; }
        @AuraEnabled public String notes { get; set; }
    }

    public class ScreenerInput {
        @AuraEnabled public String catalogName { get; set; }
        @AuraEnabled public String catalogType { get; set; }
        @AuraEnabled public String screenedDate { get; set; }
        @AuraEnabled public String score { get; set; }
        @AuraEnabled public Boolean positive { get; set; }
        @AuraEnabled public String notes { get; set; }
    }

    public class ConcernInput {
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String category { get; set; }
        @AuraEnabled public String notes { get; set; }
    }

    public class SafetyRiskInput {
        @AuraEnabled public String catalogName { get; set; }
        @AuraEnabled public String catalogCategory { get; set; }
        @AuraEnabled public Boolean recent { get; set; }
        @AuraEnabled public Boolean historical { get; set; }
        @AuraEnabled public String notes { get; set; }
    }

    private static void setLookupFieldSafely(SObject record, String fieldApiName, Object value) {
        if (value == null || String.isBlank(String.valueOf(value))) {
            return;
        }
        String idValue = String.valueOf(value).trim();
        Id parsed;
        try {
            parsed = (Id)idValue;
        } catch (Exception ex) {
            System.debug(LoggingLevel.WARN, 'Skipping assignment for ' + fieldApiName + ' due to invalid Id: ' + idValue);
            return;
        }
        record.put(fieldApiName, parsed);
    }
}