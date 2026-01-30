public with sharing class GPCaseService {
    public class PcqtOptionDTO {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
    }
    public class SupportCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
    }
    public class ConcernCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String label;
        @AuraEnabled public String category;
    }
    public class SafetyRiskCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
    }
    public class SubstanceCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
        @AuraEnabled public String description;
    }
    public class MedicationCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
        @AuraEnabled public String description;
        @AuraEnabled public String brand;
    }
    public class ScreenerCatalogItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String type;
        @AuraEnabled public String positiveOutcome;
        @AuraEnabled public String otherNotes;
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

        String normalized = normalizeCaseType(caseType);
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
    // 1c) PATIENT SUPPORT CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<SupportCatalogItem> getSupportCatalog(String caseType) {
        Schema.SObjectType supportType = Schema.getGlobalDescribe().get('Support__c');
        if (supportType == null) {
            return new List<SupportCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = supportType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            return new List<SupportCatalogItem>();
        }

        String query = 'SELECT Id, Name';
        if (fields.containsKey('Category__c')) {
            query += ', Category__c';
        }
        query += ' FROM Support__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<SupportCatalogItem> out = new List<SupportCatalogItem>();
        for (SObject row : Database.query(query)) {
            SupportCatalogItem item = new SupportCatalogItem();
            item.id = (Id)row.get('Id');
            item.name = (String)row.get('Name');
            item.category = fields.containsKey('Category__c') ? (String)row.get('Category__c') : null;
            out.add(item);
        }
        return out;
    }

    private static String normalizeCaseType(String caseType) {
        if (String.isBlank(caseType)) {
            return 'general psychiatry';
        }
        String normalized = caseType.toLowerCase().replace('_', ' ').trim();
        if (normalized.contains('addiction')) {
            return 'addiction medicine';
        }
        if (normalized.contains('general')) {
            return 'general psychiatry';
        }
        return normalized;
    }

    //
    // ======================================================
    // 1d) CONCERN CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<ConcernCatalogItem> getConcernCatalog(String caseType) {
        Schema.SObjectType concernType = Schema.getGlobalDescribe().get('Concern_List__c');
        if (concernType == null) {
            return new List<ConcernCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = concernType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            // Unknown/unsupported case type: return empty catalog.
            return new List<ConcernCatalogItem>();
        }

        String query = 'SELECT Id, Name' + (fields.containsKey('Category__c') ? ', Category__c' : '') +
            ' FROM Concern_List__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<ConcernCatalogItem> out = new List<ConcernCatalogItem>();
        for (SObject row : Database.query(query)) {
            ConcernCatalogItem item = new ConcernCatalogItem();
            item.id = (Id)row.get('Id');
            item.label = (String)row.get('Name');
            item.category = fields.containsKey('Category__c') ? (String)row.get('Category__c') : null;
            out.add(item);
        }
        return out;
    }

    //
    // ======================================================
    // 1e) SAFETY RISK CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<SafetyRiskCatalogItem> getSafetyRiskCatalog(String caseType) {
        Schema.SObjectType riskType = Schema.getGlobalDescribe().get('Safety_Risk__c');
        if (riskType == null) {
            return new List<SafetyRiskCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = riskType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            return new List<SafetyRiskCatalogItem>();
        }

        String query = 'SELECT Id, Name' + (fields.containsKey('Category__c') ? ', Category__c' : '') +
            ' FROM Safety_Risk__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<SafetyRiskCatalogItem> out = new List<SafetyRiskCatalogItem>();
        for (SObject row : Database.query(query)) {
            SafetyRiskCatalogItem item = new SafetyRiskCatalogItem();
            item.id = (Id)row.get('Id');
            item.name = (String)row.get('Name');
            item.category = fields.containsKey('Category__c') ? (String)row.get('Category__c') : null;
            out.add(item);
        }
        return out;
    }

    //
    // ======================================================
    // 1f) SUBSTANCE CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<SubstanceCatalogItem> getSubstanceCatalog(String caseType) {
        Schema.SObjectType subType = Schema.getGlobalDescribe().get('Substance_List__c');
        if (subType == null) {
            return new List<SubstanceCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = subType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            return new List<SubstanceCatalogItem>();
        }

        String query = 'SELECT Id, Name';
        if (fields.containsKey('Substance_Category__c')) {
            query += ', Substance_Category__c';
        }
        if (fields.containsKey('Description__c')) {
            query += ', Description__c';
        }
        query += ' FROM Substance_List__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<SubstanceCatalogItem> out = new List<SubstanceCatalogItem>();
        for (SObject row : Database.query(query)) {
            SubstanceCatalogItem item = new SubstanceCatalogItem();
            item.id = (Id)row.get('Id');
            item.name = (String)row.get('Name');
            item.category = fields.containsKey('Substance_Category__c') ? (String)row.get('Substance_Category__c') : null;
            item.description = fields.containsKey('Description__c') ? (String)row.get('Description__c') : null;
            out.add(item);
        }
        return out;
    }

    //
    // ======================================================
    // 1g) MEDICATION CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<MedicationCatalogItem> getMedicationCatalog(String caseType) {
        Schema.SObjectType medType = Schema.getGlobalDescribe().get('Medication__c');
        if (medType == null) {
            return new List<MedicationCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = medType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            return new List<MedicationCatalogItem>();
        }

        String query = 'SELECT Id, Name';
        if (fields.containsKey('Category__c')) {
            query += ', Category__c';
        }
        if (fields.containsKey('Description__c')) {
            query += ', Description__c';
        }
        if (fields.containsKey('Brand_Name_s__c')) {
            query += ', Brand_Name_s__c';
        }
        query += ' FROM Medication__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<MedicationCatalogItem> out = new List<MedicationCatalogItem>();
        for (SObject row : Database.query(query)) {
            MedicationCatalogItem item = new MedicationCatalogItem();
            item.id = (Id)row.get('Id');
            item.name = (String)row.get('Name');
            item.category = fields.containsKey('Category__c') ? (String)row.get('Category__c') : null;
            item.description = fields.containsKey('Description__c') ? (String)row.get('Description__c') : null;
            item.brand = fields.containsKey('Brand_Name_s__c') ? (String)row.get('Brand_Name_s__c') : null;
            out.add(item);
        }
        return out;
    }

    //
    // ======================================================
    // 1h) SCREENER CATALOG LOADER
    // ======================================================
    //
    @AuraEnabled(cacheable=true)
    public static List<ScreenerCatalogItem> getScreenerCatalog(String caseType) {
        Schema.SObjectType scrType = Schema.getGlobalDescribe().get('Screener__c');
        if (scrType == null) {
            return new List<ScreenerCatalogItem>();
        }
        Map<String, Schema.SObjectField> fields = scrType.getDescribe().fields.getMap();
        Boolean hasActive = fields.containsKey('Active__c');
        Boolean hasAddiction = fields.containsKey('Addiction_Services__c');
        Boolean hasGeneral = fields.containsKey('General_Psychiatry__c');

        String normalized = normalizeCaseType(caseType);
        List<String> filters = new List<String>();
        if (hasActive) {
            filters.add('Active__c = true');
        }
        if (normalized == 'addiction medicine' && hasAddiction) {
            filters.add('Addiction_Services__c = true');
        } else if (normalized == 'general psychiatry' && hasGeneral) {
            filters.add('General_Psychiatry__c = true');
        } else {
            return new List<ScreenerCatalogItem>();
        }

        String query = 'SELECT Id, Name';
        if (fields.containsKey('Screener_Type__c')) {
            query += ', Screener_Type__c';
        }
        if (fields.containsKey('Positive_Outcome__c')) {
            query += ', Positive_Outcome__c';
        }
        if (fields.containsKey('Other_Notes__c')) {
            query += ', Other_Notes__c';
        }
        query += ' FROM Screener__c';
        if (!filters.isEmpty()) {
            query += ' WHERE ' + String.join(filters, ' AND ');
        }
        query += ' ORDER BY Name ASC';

        List<ScreenerCatalogItem> out = new List<ScreenerCatalogItem>();
        for (SObject row : Database.query(query)) {
            ScreenerCatalogItem item = new ScreenerCatalogItem();
            item.id = (Id)row.get('Id');
            item.name = (String)row.get('Name');
            item.type = fields.containsKey('Screener_Type__c') ? (String)row.get('Screener_Type__c') : null;
            item.positiveOutcome = fields.containsKey('Positive_Outcome__c') ? (String)row.get('Positive_Outcome__c') : null;
            item.otherNotes = fields.containsKey('Other_Notes__c') ? (String)row.get('Other_Notes__c') : null;
            out.add(item);
        }
        return out;
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
                   Impaired_Domains__c, Symptom_Onset_Date__c,
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

    @AuraEnabled
    public static Map<String, Object> getCaseFullDataFresh(Id caseId) {
        return getCaseFullData(caseId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getPatientSupports(Id caseId, String cacheKey) {
        Id parentCaseId = resolveCaseId(caseId);
        return loadPatientSupportsForCase(parentCaseId);
    }



    //
    // ======================================================
    // 5) BULK SAVE HELPERS FOR RELATED COLLECTIONS
    // ======================================================
    //
    @AuraEnabled
    public static void saveMedications(Id caseId, List<MedicationInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        Id patientId = fetchCasePatient(parentCaseId);
        Map<String, Schema.SObjectField> caseFields = Case.SObjectType.getDescribe().fields.getMap();
        Boolean hasPatientField = caseFields.containsKey('Patient__c');
        String query = 'SELECT Id' + (hasPatientField ? ', Patient__c' : '') + ' FROM Case WHERE Id = :parentCaseId LIMIT 1';
        Case parentCase = (Case)Database.query(query);
        if (patientId == null && hasPatientField) {
            patientId = (Id)parentCase.get('Patient__c');
        }
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
            setBooleanFieldSafely(record, 'Allergy__c', item.allergy);
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
        Id patientId = fetchCasePatient(parentCaseId);
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
            setPatientIfPossible(record, patientId);
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
        Id patientId = fetchCasePatient(parentCaseId);
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
            setPatientIfPossible(record, patientId);
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
    public static void savePatientSupports(Id caseId, List<SupportInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        Id patientId = fetchCasePatient(parentCaseId);
        if (items == null) {
            items = new List<SupportInput>();
        }

        Set<String> supportNames = new Set<String>();
        for (SupportInput item : items) {
            if (item == null) continue;
            if (item.supportId == null && !String.isBlank(item.supportName)) {
                supportNames.add(item.supportName);
            }
        }
        Map<String, Id> supportIdsByName = fetchCatalogIds('Support__c', supportNames);

        Map<String, SupportInput> payloadBySupportId = new Map<String, SupportInput>();
        for (SupportInput item : items) {
            if (item == null) continue;
            Id supportId = item.supportId;
            if (supportId == null && !String.isBlank(item.supportName)) {
                supportId = supportIdsByName.get(item.supportName.toLowerCase());
            }
            if (supportId == null) continue;
            String key = String.valueOf(supportId);
            if (!payloadBySupportId.containsKey(key)) {
                item.supportId = supportId;
                payloadBySupportId.put(key, item);
            }
        }

        Map<Id, Patient_Support__c> existingBySupport = new Map<Id, Patient_Support__c>();
        for (Patient_Support__c ps : [
            SELECT Id, Support__c
            FROM Patient_Support__c
            WHERE Case__c = :parentCaseId
        ]) {
            if (ps.Support__c != null) {
                existingBySupport.put(ps.Support__c, ps);
            }
        }

        Map<String, Schema.SObjectField> fields = Patient_Support__c.SObjectType.getDescribe().fields.getMap();
        List<Patient_Support__c> toInsert = new List<Patient_Support__c>();
        List<Patient_Support__c> toUpdate = new List<Patient_Support__c>();
        Set<Id> desiredSupportIds = new Set<Id>();

        for (SupportInput item : payloadBySupportId.values()) {
            Id supportId = item.supportId;
            if (supportId == null) continue;
            desiredSupportIds.add(supportId);
            Patient_Support__c record = existingBySupport.get(supportId);
            Boolean isNew = false;
            if (record == null) {
                record = new Patient_Support__c();
                record.Case__c = parentCaseId;
                record.Support__c = supportId;
                setPatientIfPossible(record, patientId);
                isNew = true;
            }

            if (fields.containsKey('Notes_new__c')) {
                record.put('Notes_new__c', item.notes);
            }
            setBooleanFieldSafely(record, 'Scheduled__c', item.scheduled);
            setBooleanFieldSafely(record, 'Going__c', item.going);
            setBooleanFieldSafely(record, 'Appointment_Completed__c', item.appointmentCompleted);
            setBooleanFieldSafely(record, 'Appointment_Completed_Ineffective__c', item.appointmentCompletedIneffective);
            setBooleanFieldSafely(record, 'Suspended__c', item.suspended);
            setBooleanFieldSafely(record, 'Care_Not_Applicable__c', item.careNotApplicable);

            if (isNew) {
                toInsert.add(record);
            } else {
                toUpdate.add(record);
            }
        }

        List<Patient_Support__c> toDelete = new List<Patient_Support__c>();
        for (Id supportId : existingBySupport.keySet()) {
            if (!desiredSupportIds.contains(supportId)) {
                toDelete.add(existingBySupport.get(supportId));
            }
        }

        if (!toInsert.isEmpty()) insert toInsert;
        if (!toUpdate.isEmpty()) update toUpdate;
        if (!toDelete.isEmpty()) delete toDelete;
    }

    @AuraEnabled
    public static void saveConcerns(Id caseId, List<ConcernInput> items, Boolean deleteMissing) {
        Id parentCaseId = resolveCaseId(caseId);
        Id patientId = fetchCasePatient(parentCaseId);
        if (items == null) {
            items = new List<ConcernInput>();
        }
        Boolean shouldDeleteMissing = (deleteMissing == true);

        // Catalog lookup for incoming payload
        Map<String, Id> concerns = fetchCatalogIds('Concern_List__c', collectNamesFromConcerns(items));

        // Existing records (to preserve manual)
        List<Patient_Concern__c> existingRecords = [
            SELECT Id, Concern__r.Name, Concern__c, Seed_Source__c, Notes_new__c, CreatedDate
            FROM Patient_Concern__c
            WHERE Case__c = :parentCaseId
            ORDER BY CreatedDate ASC
        ];

        List<Patient_Concern__c> duplicateDeletes = new List<Patient_Concern__c>();
        List<Patient_Concern__c> dedupedExisting = new List<Patient_Concern__c>();
        Set<String> seenExistingKeys = new Set<String>();
        for (Patient_Concern__c pc : existingRecords) {
            String key = pc.Concern__c != null
                ? String.valueOf(pc.Concern__c)
                : (pc.Concern__r != null && !String.isBlank(pc.Concern__r.Name)
                    ? pc.Concern__r.Name.toLowerCase()
                    : null);
            if (String.isBlank(key)) {
                dedupedExisting.add(pc);
                continue;
            }
            if (seenExistingKeys.contains(key)) {
                duplicateDeletes.add(new Patient_Concern__c(Id = pc.Id));
            } else {
                seenExistingKeys.add(key);
                dedupedExisting.add(pc);
            }
        }

        Map<String, Patient_Concern__c> existingByKey = new Map<String, Patient_Concern__c>();
        Map<String, Patient_Concern__c> existingByLabel = new Map<String, Patient_Concern__c>();
        for (Patient_Concern__c pc : dedupedExisting) {
            if (pc.Concern__c != null) {
                existingByKey.put(String.valueOf(pc.Concern__c), pc);
            }
            if (pc.Concern__r != null && !String.isBlank(pc.Concern__r.Name)) {
                String labelKey = pc.Concern__r.Name.toLowerCase();
                existingByKey.put(labelKey, pc);
                existingByLabel.put(labelKey, pc);
            }
        }

        // Normalize category values (restricted picklists need exact matches)
        for (ConcernInput item : items) {
            if (item == null) continue;
            String normalizedCategory = normalizeConcernCategory(item.category);
            if (!String.isBlank(normalizedCategory)) {
                item.category = normalizedCategory;
            }
        }

        // Deduplicate payload by catalogId (preferred) or label (case-insensitive)
        Set<String> labelsWithCatalogId = new Set<String>();
        for (ConcernInput item : items) {
            if (item == null || item.catalogId == null || String.isBlank(item.label)) continue;
            labelsWithCatalogId.add(item.label.toLowerCase());
        }

        Map<String, ConcernInput> payloadByKey = new Map<String, ConcernInput>();
        for (ConcernInput item : items) {
            if (item == null || String.isBlank(item.label)) continue;
            String labelKey = item.label.toLowerCase();
            if (item.catalogId == null && labelsWithCatalogId.contains(labelKey)) {
                continue;
            }
            String key = item.catalogId != null ? String.valueOf(item.catalogId) : labelKey;
            if (!payloadByKey.containsKey(key)) {
                payloadByKey.put(key, item);
            } else {
                ConcernInput existing = payloadByKey.get(key);
                // Prefer non-blank notes/category/source
                if (String.isBlank(existing.notes) && !String.isBlank(item.notes)) {
                    existing.notes = item.notes;
                }
                if (String.isBlank(existing.category) && !String.isBlank(item.category)) {
                    existing.category = item.category;
                }
                if (String.isBlank(existing.source) && !String.isBlank(item.source)) {
                    existing.source = item.source;
                }
                payloadByKey.put(key, existing);
            }
        }

        Set<String> payloadKeys = new Set<String>(payloadByKey.keySet());
        List<Patient_Concern__c> toUpsert = new List<Patient_Concern__c>();
        for (String key : payloadByKey.keySet()) {
            ConcernInput item = payloadByKey.get(key);
            Id concernId = item.catalogId;
            if (concernId == null) {
                String lookupKey = item.label != null ? item.label.toLowerCase() : null;
                concernId = lookupKey != null ? concerns.get(lookupKey) : null;
                if (concernId == null) {
                    concernId = ensureCatalogRecord('Concern_List__c', item.label, new Map<String, Object>{
                        'Category__c' => item.category
                    });
                    if (lookupKey != null) {
                        concerns.put(lookupKey, concernId);
                    }
                }
            }

            Patient_Concern__c existing = existingByKey.get(key);
            if (existing == null) {
                String labelKey = item.label != null ? item.label.toLowerCase() : null;
                if (labelKey != null) {
                    existing = existingByLabel.get(labelKey);
                }
            }
            Patient_Concern__c record = new Patient_Concern__c();
            record.Id = existing != null ? existing.Id : null;
            if (record.Id == null) {
                record.Case__c = parentCaseId;
                record.Concern__c = concernId;
            } else if (concernId != null && existing.Concern__c != concernId) {
                record.Concern__c = concernId;
            }
            setPatientIfPossible(record, patientId);
            record.Notes_new__c = item.notes;
            String seed = resolveConcernSeed(item.source, item.category);
            if (seed != null) {
                record.Seed_Source__c = seed;
            }
            toUpsert.add(record);
        }

        // Delete seeded (or all missing when requested)
        Set<String> seededValues = new Set<String>{
            'Step2_TopSymptoms', 'Step3_PriorDiagnosis', 'Step6_PsychosisMania',
            'Step6_MedicalRedFlags', 'Step7_FamilyHistory'
        };
        List<Patient_Concern__c> toDelete = new List<Patient_Concern__c>();
        for (Patient_Concern__c existing : dedupedExisting) {
            String idKey = existing.Concern__c != null ? String.valueOf(existing.Concern__c) : null;
            String labelKey = (existing.Concern__r != null && !String.isBlank(existing.Concern__r.Name))
                ? existing.Concern__r.Name.toLowerCase()
                : null;
            Boolean inPayload = (idKey != null && payloadKeys.contains(idKey))
                || (labelKey != null && payloadKeys.contains(labelKey));
            if (!inPayload && (shouldDeleteMissing || seededValues.contains(existing.Seed_Source__c))) {
                toDelete.add(new Patient_Concern__c(Id = existing.Id));
            }
        }
        if (!duplicateDeletes.isEmpty()) {
            toDelete.addAll(duplicateDeletes);
        }

        if (!toUpsert.isEmpty()) {
            upsert toUpsert;
        }
        if (!toDelete.isEmpty()) {
            delete toDelete;
        }
    }

    @AuraEnabled
    public static void saveSafetyRisks(Id caseId, List<SafetyRiskInput> items) {
        Id parentCaseId = resolveCaseId(caseId);
        Id patientId = fetchCasePatient(parentCaseId);
        System.debug(LoggingLevel.INFO, 'saveSafetyRisks => items: ' + JSON.serialize(items));
        if (items == null) {
            items = new List<SafetyRiskInput>();
        }

        Map<String, Id> risks = fetchCatalogIds('Safety_Risk__c', collectNamesFromSafetyRisks(items));

        List<Patient_Safety_Risk__c> existingRecords = [
            SELECT Id, Safety_Risk__r.Name, Safety_Risk__c, Seed_Source__c, Notes_new__c, Recent__c, Historical__c, CreatedDate
            FROM Patient_Safety_Risk__c
            WHERE Case__c = :parentCaseId
            ORDER BY CreatedDate ASC
        ];

        List<Patient_Safety_Risk__c> duplicateDeletes = new List<Patient_Safety_Risk__c>();
        List<Patient_Safety_Risk__c> dedupedExisting = new List<Patient_Safety_Risk__c>();
        Set<String> seenExistingKeys = new Set<String>();
        for (Patient_Safety_Risk__c risk : existingRecords) {
            String key = risk.Safety_Risk__c != null
                ? String.valueOf(risk.Safety_Risk__c)
                : (risk.Safety_Risk__r != null && !String.isBlank(risk.Safety_Risk__r.Name)
                    ? risk.Safety_Risk__r.Name.toLowerCase()
                    : null);
            if (String.isBlank(key)) {
                dedupedExisting.add(risk);
                continue;
            }
            if (seenExistingKeys.contains(key)) {
                duplicateDeletes.add(new Patient_Safety_Risk__c(Id = risk.Id));
            } else {
                seenExistingKeys.add(key);
                dedupedExisting.add(risk);
            }
        }

        Map<String, Patient_Safety_Risk__c> existingByKey = new Map<String, Patient_Safety_Risk__c>();
        Map<String, Patient_Safety_Risk__c> existingByName = new Map<String, Patient_Safety_Risk__c>();
        for (Patient_Safety_Risk__c risk : dedupedExisting) {
            if (risk.Safety_Risk__c != null) {
                existingByKey.put(String.valueOf(risk.Safety_Risk__c), risk);
            }
            if (risk.Safety_Risk__r != null && !String.isBlank(risk.Safety_Risk__r.Name)) {
                String key = risk.Safety_Risk__r.Name.toLowerCase();
                existingByKey.put(key, risk);
                existingByName.put(key, risk);
            }
        }

        // Deduplicate payload by catalogId (preferred) or name
        Set<String> namesWithCatalogId = new Set<String>();
        for (SafetyRiskInput item : items) {
            if (item == null || item.catalogId == null || String.isBlank(item.catalogName)) continue;
            namesWithCatalogId.add(item.catalogName.toLowerCase());
        }

        Map<String, SafetyRiskInput> payloadByKey = new Map<String, SafetyRiskInput>();
        for (SafetyRiskInput item : items) {
            if (item == null || String.isBlank(item.catalogName)) continue;
            String nameKey = item.catalogName.toLowerCase();
            if (item.catalogId == null && namesWithCatalogId.contains(nameKey)) {
                continue;
            }
            String key = item.catalogId != null ? String.valueOf(item.catalogId) : nameKey;
            if (!payloadByKey.containsKey(key)) {
                payloadByKey.put(key, item);
            } else {
                SafetyRiskInput existing = payloadByKey.get(key);
                existing.recent = existing.recent == true || item.recent == true;
                existing.historical = existing.historical == true || item.historical == true;
                if (String.isBlank(existing.notes) && !String.isBlank(item.notes)) {
                    existing.notes = item.notes;
                }
                if (String.isBlank(existing.catalogCategory) && !String.isBlank(item.catalogCategory)) {
                    existing.catalogCategory = item.catalogCategory;
                }
                if (String.isBlank(existing.source) && !String.isBlank(item.source)) {
                    existing.source = item.source;
                }
                payloadByKey.put(key, existing);
            }
        }

        Set<String> payloadKeys = new Set<String>(payloadByKey.keySet());
        List<Patient_Safety_Risk__c> toUpsert = new List<Patient_Safety_Risk__c>();
        for (String key : payloadByKey.keySet()) {
            SafetyRiskInput item = payloadByKey.get(key);
            Id riskId = item.catalogId;
            if (riskId == null) {
                String lookupKey = item.catalogName != null ? item.catalogName.toLowerCase() : null;
                riskId = lookupKey != null ? risks.get(lookupKey) : null;
                if (riskId == null) {
                    riskId = ensureCatalogRecord('Safety_Risk__c', item.catalogName, new Map<String, Object>{
                        'Category__c' => item.catalogCategory
                    });
                    if (lookupKey != null) {
                        risks.put(lookupKey, riskId);
                    }
                }
            }

            Patient_Safety_Risk__c existing = existingByKey.get(key);
            if (existing == null) {
                String nameKey = item.catalogName != null ? item.catalogName.toLowerCase() : null;
                if (nameKey != null) {
                    existing = existingByName.get(nameKey);
                }
            }

            Patient_Safety_Risk__c record = new Patient_Safety_Risk__c();
            record.Id = existing != null ? existing.Id : null;
            if (record.Id == null) {
                record.Case__c = parentCaseId;
                record.Safety_Risk__c = riskId;
            } else if (riskId != null && existing.Safety_Risk__c != riskId) {
                record.Safety_Risk__c = riskId;
            }
            setPatientIfPossible(record, patientId);
            setBooleanFieldSafely(record, 'Recent__c', item.recent);
            setBooleanFieldSafely(record, 'Historical__c', item.historical);
            record.Notes_new__c = item.notes;
            String seed = resolveSafetySeed(item.source, item.catalogCategory);
            if (seed != null) {
                record.Seed_Source__c = seed;
            }
            toUpsert.add(record);
        }

        List<Patient_Safety_Risk__c> toDelete = new List<Patient_Safety_Risk__c>();
        for (Patient_Safety_Risk__c existing : dedupedExisting) {
            String idKey = existing.Safety_Risk__c != null ? String.valueOf(existing.Safety_Risk__c) : null;
            String nameKey = (existing.Safety_Risk__r != null && !String.isBlank(existing.Safety_Risk__r.Name))
                ? existing.Safety_Risk__r.Name.toLowerCase()
                : null;
            Boolean inPayload = (idKey != null && payloadKeys.contains(idKey))
                || (nameKey != null && payloadKeys.contains(nameKey));
            if (!inPayload) {
                toDelete.add(new Patient_Safety_Risk__c(Id = existing.Id));
            }
        }
        if (!duplicateDeletes.isEmpty()) {
            toDelete.addAll(duplicateDeletes);
        }

        if (!toUpsert.isEmpty()) {
            upsert toUpsert;
        }
        if (!toDelete.isEmpty()) {
            delete toDelete;
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
            SELECT Id, Name, Medication_List__c, Medication_List__r.Name, Medication_List__r.Category__c,
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
            entry.put('recordName', med.Name);
            entry.put('recordId', med.Id);
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
            SELECT Id, Name, Substance_Listing__c, Substance_Listing__r.Name, Substance_Listing__r.Substance_Category__c,
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
            entry.put('recordName', sub.Name);
            entry.put('recordId', sub.Id);
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
            SELECT Id, Name, Screener__c, Screener__r.Name, Screener__r.Screener_Type__c,
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
            entry.put('recordName', scr.Name);
            entry.put('recordId', scr.Id);
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
            SELECT Id, Concern__c, Concern__r.Name, Concern__r.Category__c, Notes_new__c, Seed_Source__c
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
            entry.put('source', concern.Seed_Source__c != null ? concern.Seed_Source__c : 'Manual');
            results.add(entry);
        }
        return results;
    }

    private static List<Map<String, Object>> loadPatientSupportsForCase(Id caseId) {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        if (caseId == null) {
            return results;
        }
        Map<String, Schema.SObjectField> fields = Patient_Support__c.SObjectType.getDescribe().fields.getMap();
        String query = 'SELECT Id, Name, Support__c, Support__r.Name';
        if (fields.containsKey('Notes_new__c')) {
            query += ', Notes_new__c';
        }
        if (fields.containsKey('Scheduled__c')) {
            query += ', Scheduled__c';
        }
        if (fields.containsKey('Going__c')) {
            query += ', Going__c';
        }
        if (fields.containsKey('Appointment_Completed__c')) {
            query += ', Appointment_Completed__c';
        }
        if (fields.containsKey('Appointment_Completed_Ineffective__c')) {
            query += ', Appointment_Completed_Ineffective__c';
        }
        if (fields.containsKey('Suspended__c')) {
            query += ', Suspended__c';
        }
        if (fields.containsKey('Care_Not_Applicable__c')) {
            query += ', Care_Not_Applicable__c';
        }
        query += ' FROM Patient_Support__c WHERE Case__c = :caseId ORDER BY CreatedDate ASC';

        for (SObject row : Database.query(query)) {
            SObject supportRef = row.getSObject('Support__r');
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', row.get('Support__c'));
            entry.put('catalogId', row.get('Support__c'));
            entry.put('catalogName', supportRef != null ? (String)supportRef.get('Name') : null);
            entry.put('notes', fields.containsKey('Notes_new__c') ? row.get('Notes_new__c') : null);
            entry.put('scheduled', fields.containsKey('Scheduled__c') ? row.get('Scheduled__c') : null);
            entry.put('going', fields.containsKey('Going__c') ? row.get('Going__c') : null);
            entry.put('appointmentCompleted', fields.containsKey('Appointment_Completed__c') ? row.get('Appointment_Completed__c') : null);
            entry.put('appointmentCompletedIneffective', fields.containsKey('Appointment_Completed_Ineffective__c') ? row.get('Appointment_Completed_Ineffective__c') : null);
            entry.put('suspended', fields.containsKey('Suspended__c') ? row.get('Suspended__c') : null);
            entry.put('careNotApplicable', fields.containsKey('Care_Not_Applicable__c') ? row.get('Care_Not_Applicable__c') : null);
            entry.put('recordName', row.get('Name'));
            entry.put('recordId', row.get('Id'));
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
            SELECT Id, Name, Safety_Risk__c, Safety_Risk__r.Name, Safety_Risk__r.Category__c,
                   Recent__c, Historical__c, Notes_new__c, Seed_Source__c
            FROM Patient_Safety_Risk__c
            WHERE Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];
        for (Patient_Safety_Risk__c risk : risks) {
            Map<String, Object> entry = new Map<String, Object>();
            entry.put('id', risk.Safety_Risk__c);
            entry.put('catalogId', risk.Safety_Risk__c);
            entry.put('catalogName', risk.Safety_Risk__r != null ? risk.Safety_Risk__r.Name : null);
            entry.put('catalogCategory', risk.Safety_Risk__r != null ? (String)risk.Safety_Risk__r.get('Category__c') : null);
            entry.put('recent', risk.Recent__c);
            entry.put('historical', risk.Historical__c);
            entry.put('notes', risk.Notes_new__c);
            entry.put('source', risk.Seed_Source__c != null ? risk.Seed_Source__c : 'Manual');
            entry.put('recordName', risk.Name);
            entry.put('recordId', risk.Id);
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

    // Build concerns from Case fields (psychosis/mania shared note + red flags shared note).
    private static List<ConcernInput> buildCaseDrivenConcerns(Id caseId) {
        List<ConcernInput> results = new List<ConcernInput>();
        if (caseId == null) return results;

        Case c = [
            SELECT Psychosis_Symptoms__c, Mania_Symptoms__c, Medical_Red_Flags__c,
                   Psychosis_Notes__c, Medical_Notes__c
            FROM Case
            WHERE Id = :caseId
            LIMIT 1
        ];

        String sharedPsychosisNote = c.Psychosis_Notes__c;
        String sharedRedFlagNote = c.Medical_Notes__c;

        // Psychosis symptoms
        for (String val : parseMultiValue(c.Psychosis_Symptoms__c)) {
            ConcernInput ci = new ConcernInput();
            ci.label = val;
            ci.category = 'Psychosis Symptoms';
            ci.notes = sharedPsychosisNote;
            ci.source = 'Step6_PsychosisMania';
            results.add(ci);
        }
        // Mania / Hypomania symptoms
        for (String val : parseMultiValue(c.Mania_Symptoms__c)) {
            ConcernInput ci = new ConcernInput();
            ci.label = val;
            ci.category = 'Mania/Hypomania Symptoms';
            ci.notes = sharedPsychosisNote;
            ci.source = 'Step6_PsychosisMania';
            results.add(ci);
        }
        // Medical red flags
        for (String val : parseMultiValue(c.Medical_Red_Flags__c)) {
            ConcernInput ci = new ConcernInput();
            ci.label = val;
            ci.category = 'Medical Red Flags';
            ci.notes = sharedRedFlagNote;
            ci.source = 'Step6_MedicalRedFlags';
            results.add(ci);
        }
        return results;
    }

    private static List<String> parseMultiValue(String raw) {
        List<String> values = new List<String>();
        if (String.isBlank(raw)) return values;
        for (String v : raw.split(';')) {
            if (!String.isBlank(v)) {
                values.add(v.trim());
            }
        }
        return values;
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

    private static Set<String> collectNamesFromSupports(List<SupportInput> items) {
        Set<String> names = new Set<String>();
        if (items == null) return names;
        for (SupportInput item : items) {
            if (!String.isBlank(item.supportName)) {
                names.add(item.supportName);
            }
        }
        return names;
    }

    private static void setBooleanFieldIfExists(SObject record, Map<String, Schema.SObjectField> fields, String fieldName, Boolean value) {
        if (record == null || fields == null || !fields.containsKey(fieldName)) return;
        Schema.DescribeFieldResult d = fields.get(fieldName).getDescribe();
        if (d == null || d.getType() != Schema.DisplayType.Boolean) return;
        record.put(fieldName, value);
    }

    private static Id fetchCasePatient(Id caseId) {
        if (caseId == null) return null;
        Map<String, Schema.SObjectField> fields = Case.SObjectType.getDescribe().fields.getMap();
        Boolean hasPatient = fields.containsKey('Patient__c');
        String query = 'SELECT Id, ContactId' + (hasPatient ? ', Patient__c' : '') + ' FROM Case WHERE Id = :caseId LIMIT 1';
        Case c = (Case)Database.query(query);
        if (hasPatient) {
            Id p = (Id)c.get('Patient__c');
            if (p != null) return p;
        }
        return c.ContactId;
    }

    private static void setPatientIfPossible(SObject record, Id patientId) {
        if (patientId == null) return;
        Map<String, Schema.SObjectField> fields = record.getSObjectType().getDescribe().fields.getMap();
        if (fields.containsKey('Patient__c')) {
            record.put('Patient__c', patientId);
        } else if (fields.containsKey('Contact__c')) {
            record.put('Contact__c', patientId);
        }
    }

    private static String resolveConcernSeed(String source, String category) {
        if (String.isBlank(source)) return null;
        String normalized = source.trim();
        String lower = normalized.toLowerCase();
        if (lower.startsWith('step')) {
            return normalized;
        }
        if (lower == 'presenting' || lower == 'top symptoms') {
            return 'Step2_TopSymptoms';
        }
        if (lower == 'priordx' || lower == 'prior diagnosis') {
            return 'Step3_PriorDiagnosis';
        }
        if (lower == 'psychosismania' || lower == 'psychosis_mania' || lower == 'psychosis mania' || lower == 'psychosis' || lower == 'mania') {
            return 'Step6_PsychosisMania';
        }
        if (lower == 'redflags' || lower == 'medicalredflags' || lower == 'medical red flags' || lower == 'red flags') {
            return 'Step6_MedicalRedFlags';
        }
        if (lower == 'familyhistory' || lower == 'family') {
            return 'Step7_FamilyHistory';
        }
        if (lower == 'manual') {
            return 'Manual';
        }
        // Fallback based on category for step 6
        if (!String.isBlank(category)) {
            String catLower = category.toLowerCase();
            if (catLower.contains('psychosis') || catLower.contains('mania')) {
                return 'Step6_PsychosisMania';
            }
            if (catLower.contains('medical red flag')) {
                return 'Step6_MedicalRedFlags';
            }
        }
        return null;
    }

    private static String normalizeConcernCategory(String category) {
        if (String.isBlank(category)) {
            return null;
        }
        String trimmed = category.trim();
        String lower = trimmed.toLowerCase();
        if (lower.contains('mania') && lower.contains('hypomania')) {
            return 'Mania/Hypomania Symptoms';
        }
        if (lower.contains('psychosis')) {
            return 'Psychosis Symptoms';
        }
        if (lower.contains('medical red flag')) {
            return 'Medical Red Flags';
        }
        if (lower == 'prior diagnosis' || lower == 'prior diagnoses') {
            return 'Prior Diagnoses';
        }
        if (lower == 'top symptoms' || lower == 'top symptom') {
            return 'Top Symptoms';
        }
        if (lower == 'family history') {
            return 'Family History';
        }
        return trimmed;
    }

    private static String resolveSafetySeed(String source, String category) {
        if (String.isBlank(source)) return null;
        String normalized = source.trim();
        String lower = normalized.toLowerCase();
        if (lower.startsWith('step')) {
            return normalized;
        }
        if (lower == 'stressors' || lower == 'psychological stressors') {
            return 'Step8_PsychologicalStressors';
        }
        if (lower == 'manual') {
            return 'Manual';
        }
        if (!String.isBlank(category) && category.toLowerCase().contains('psychological')) {
            return 'Step8_PsychologicalStressors';
        }
        return null;
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
        @AuraEnabled public Id catalogId { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String category { get; set; }
        @AuraEnabled public String notes { get; set; }
        @AuraEnabled public String source { get; set; }
    }

    public class SafetyRiskInput {
        @AuraEnabled public Id catalogId { get; set; }
        @AuraEnabled public String catalogName { get; set; }
        @AuraEnabled public String catalogCategory { get; set; }
        @AuraEnabled public Boolean recent { get; set; }
        @AuraEnabled public Boolean historical { get; set; }
        @AuraEnabled public String notes { get; set; }
        @AuraEnabled public String source { get; set; }
    }

    public class SupportInput {
        @AuraEnabled public Id supportId { get; set; }
        @AuraEnabled public String supportName { get; set; }
        @AuraEnabled public String notes { get; set; }
        @AuraEnabled public Boolean scheduled { get; set; }
        @AuraEnabled public Boolean going { get; set; }
        @AuraEnabled public Boolean appointmentCompleted { get; set; }
        @AuraEnabled public Boolean appointmentCompletedIneffective { get; set; }
        @AuraEnabled public Boolean suspended { get; set; }
        @AuraEnabled public Boolean careNotApplicable { get; set; }
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

    private static void setBooleanFieldSafely(SObject record, String fieldApiName, Object value) {
        if (record == null || String.isBlank(fieldApiName)) {
            return;
        }
        try {
            Map<String, Schema.SObjectField> fieldMap = record.getSObjectType().getDescribe().fields.getMap();
            if (!fieldMap.containsKey(fieldApiName)) {
                return;
            }
            Schema.DisplayType fieldType = fieldMap.get(fieldApiName).getDescribe().getType();
            if (fieldType != Schema.DisplayType.Boolean) {
                return;
            }
            Boolean coerced = coerceBoolean(value);
            if (coerced == null) {
                return;
            }
            record.put(fieldApiName, coerced);
        } catch (Exception ex) {
            System.debug(LoggingLevel.WARN, 'Skipping assignment for ' + fieldApiName + ' due to invalid boolean value: ' + value);
        }
    }

    private static Boolean coerceBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean)value;
        }
        if (value instanceof String) {
            String trimmed = ((String)value).trim().toLowerCase();
            if (trimmed == 'true') return true;
            if (trimmed == 'false') return false;
        }
        if (value instanceof Integer) {
            Integer num = (Integer)value;
            if (num == 1) return true;
            if (num == 0) return false;
        }
        if (value instanceof Long) {
            Long num = (Long)value;
            if (num == 1) return true;
            if (num == 0) return false;
        }
        if (value instanceof Decimal) {
            Decimal num = (Decimal)value;
            if (num == 1) return true;
            if (num == 0) return false;
        }
        return null;
    }
}