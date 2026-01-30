@IsTest
private class GPCaseServiceTest {
    @testSetup
    static void setupData() {
        Account practice = new Account(Name = 'Practice');
        insert practice;

        Contact patient = new Contact(FirstName = 'Test', LastName = 'Patient');
        insert patient;

        insert new PCQT__c(Name = 'PCQT General', General_Psychiatry__c = true);
        insert new PCQT__c(Name = 'PCQT Addiction', Addiction_Services__c = true);

        insert buildSupport('Support A');
        insert buildConcern('Concern A');
        insert buildSafetyRisk('Risk A');
        insert buildSubstance('Substance A');
        insert buildMedication('Medication A');
        insert buildScreener('Screener A');
    }

    private static Case createCase(Id accountId, Id contactId, Id recordTypeId, Id parentId) {
        Case c = new Case(
            Subject = 'Test Case',
            Status = 'New',
            AccountId = accountId,
            ContactId = contactId,
            ParentId = parentId
        );
        if (recordTypeId != null) {
            c.RecordTypeId = recordTypeId;
        }
        insert c;
        return c;
    }

    private static Support__c buildSupport(String name) {
        Support__c rec = new Support__c(Name = name);
        Map<String, Schema.SObjectField> fields = Support__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Category__c')) rec.put('Category__c', firstPicklistValue(fields.get('Category__c')));
        return rec;
    }

    private static Concern_List__c buildConcern(String name) {
        Concern_List__c rec = new Concern_List__c(Name = name);
        Map<String, Schema.SObjectField> fields = Concern_List__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Category__c')) rec.put('Category__c', firstPicklistValue(fields.get('Category__c')));
        return rec;
    }

    private static Safety_Risk__c buildSafetyRisk(String name) {
        Safety_Risk__c rec = new Safety_Risk__c(Name = name);
        Map<String, Schema.SObjectField> fields = Safety_Risk__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Category__c')) rec.put('Category__c', firstPicklistValue(fields.get('Category__c')));
        return rec;
    }

    private static Substance_List__c buildSubstance(String name) {
        Substance_List__c rec = new Substance_List__c(Name = name);
        Map<String, Schema.SObjectField> fields = Substance_List__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Substance_Category__c')) rec.put('Substance_Category__c', firstPicklistValue(fields.get('Substance_Category__c')));
        if (fields.containsKey('Description__c')) rec.put('Description__c', 'Desc');
        return rec;
    }

    private static Medication__c buildMedication(String name) {
        Medication__c rec = new Medication__c(Name = name);
        Map<String, Schema.SObjectField> fields = Medication__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Category__c')) rec.put('Category__c', firstPicklistValue(fields.get('Category__c')));
        if (fields.containsKey('Description__c')) rec.put('Description__c', 'Desc');
        if (fields.containsKey('Brand_Name_s__c')) rec.put('Brand_Name_s__c', 'Brand');
        return rec;
    }

    private static Screener__c buildScreener(String name) {
        Screener__c rec = new Screener__c(Name = name);
        Map<String, Schema.SObjectField> fields = Screener__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('General_Psychiatry__c')) rec.put('General_Psychiatry__c', true);
        if (fields.containsKey('Addiction_Services__c')) rec.put('Addiction_Services__c', true);
        if (fields.containsKey('Active__c')) rec.put('Active__c', true);
        if (fields.containsKey('Screener_Type__c')) rec.put('Screener_Type__c', firstPicklistValue(fields.get('Screener_Type__c')));
        if (fields.containsKey('Positive_Outcome__c')) rec.put('Positive_Outcome__c', 'Outcome');
        if (fields.containsKey('Other_Notes__c')) rec.put('Other_Notes__c', 'Notes');
        return rec;
    }

    private static String firstPicklistValue(Schema.SObjectField field) {
        if (field == null) return null;
        Schema.DescribeFieldResult d = field.getDescribe();
        if (d == null) return null;
        Schema.DisplayType type = d.getType();
        if (type != Schema.DisplayType.Picklist && type != Schema.DisplayType.MultiPicklist) {
            return null;
        }
        for (Schema.PicklistEntry entry : d.getPicklistValues()) {
            if (entry.isActive()) {
                return entry.getValue();
            }
        }
        return null;
    }

    @IsTest
    static void testGetAuthoritativeCaseId() {
        Id patientRt = null;
        Id otherRt = null;
        for (RecordType rt : [
            SELECT Id, DeveloperName
            FROM RecordType
            WHERE SObjectType = 'Case' AND DeveloperName IN ('Patient_Case', 'Other_Case')
        ]) {
            if (rt.DeveloperName == 'Patient_Case') patientRt = rt.Id;
            if (rt.DeveloperName == 'Other_Case') otherRt = rt.Id;
        }
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];

        Case parent = createCase(practice.Id, patient.Id, otherRt, null);
        Case child = createCase(practice.Id, patient.Id, otherRt, parent.Id);

        System.assertEquals(parent.Id, GPCaseService.getAuthoritativeCaseId(parent.Id));
        System.assertEquals(parent.Id, GPCaseService.getAuthoritativeCaseId(child.Id));
        if (patientRt != null) {
            Case patientCase = createCase(practice.Id, patient.Id, patientRt, parent.Id);
            System.assertEquals(patientCase.Id, GPCaseService.getAuthoritativeCaseId(patientCase.Id));
        }
    }

    @IsTest
    static void testGetPcqtOptions() {
        List<GPCaseService.PcqtOptionDTO> general = GPCaseService.getPcqtOptions('General Psychiatry');
        List<GPCaseService.PcqtOptionDTO> addiction = GPCaseService.getPcqtOptions('Addiction Medicine');
        List<GPCaseService.PcqtOptionDTO> all = GPCaseService.getPcqtOptions('all');
        System.assert(general.size() > 0, 'General PCQT options should return.');
        System.assert(addiction.size() > 0, 'Addiction PCQT options should return.');
        System.assert(all.size() > 0, 'All PCQT options should return.');
    }

    @IsTest
    static void testCatalogLoaders() {
        Boolean supportHasGeneral = Support__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');
        Boolean concernHasGeneral = Concern_List__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');
        Boolean riskHasGeneral = Safety_Risk__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');
        Boolean substanceHasGeneral = Substance_List__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');
        Boolean medHasGeneral = Medication__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');
        Boolean screenerHasGeneral = Screener__c.SObjectType.getDescribe().fields.getMap().containsKey('General_Psychiatry__c');

        System.assertEquals(supportHasGeneral ? 1 : 0, GPCaseService.getSupportCatalog('General Psychiatry').size());
        System.assertEquals(concernHasGeneral ? 1 : 0, GPCaseService.getConcernCatalog('General Psychiatry').size());
        System.assertEquals(riskHasGeneral ? 1 : 0, GPCaseService.getSafetyRiskCatalog('General Psychiatry').size());
        System.assertEquals(substanceHasGeneral ? 1 : 0, GPCaseService.getSubstanceCatalog('General Psychiatry').size());
        System.assertEquals(medHasGeneral ? 1 : 0, GPCaseService.getMedicationCatalog('General Psychiatry').size());
        System.assertEquals(screenerHasGeneral ? 1 : 0, GPCaseService.getScreenerCatalog('General Psychiatry').size());
    }

    @IsTest
    static void testCreateCaseAndGetCase() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Map<String, Object> payload = new Map<String, Object>{
            'Subject' => 'Created',
            'Description' => 'Desc',
            'Priority' => 'Medium',
            'AccountId' => practice.Id,
            'ContactId' => patient.Id
        };
        Id caseId = GPCaseService.createCase(payload);
        Case c = GPCaseService.getCase(caseId);
        System.assertEquals('Created', c.Subject);
        System.assertEquals('Desc', c.Description);
        System.assertEquals('Medium', c.Priority);
    }

    @IsTest
    static void testSaveStepDataAndGetCaseFullData() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Step', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        Map<String, Object> step = new Map<String, Object>();
        Map<String, Schema.SObjectField> caseFields = Case.SObjectType.getDescribe().fields.getMap();
        if (caseFields.containsKey('Impairment_Level__c')) {
            step.put('Impairment_Level__c', firstPicklistValue(caseFields.get('Impairment_Level__c')));
        }
        if (caseFields.containsKey('Symptom_Onset_Date__c')) {
            step.put('Symptom_Onset_Date__c', String.valueOf(Date.today()));
        }
        if (caseFields.containsKey('Other_Symptoms__c')) {
            step.put('Other_Symptoms__c', 'Other');
        }
        if (caseFields.containsKey('Top_Symptoms__c')) {
            step.put('Top_Symptoms__c', firstPicklistValue(caseFields.get('Top_Symptoms__c')));
        }
        GPCaseService.saveStepData(c.Id, step);

        List<GPCaseService.MedicationInput> meds = new List<GPCaseService.MedicationInput>();
        GPCaseService.MedicationInput med = new GPCaseService.MedicationInput();
        med.catalogName = 'Medication A';
        med.action = null;
        med.frequency = null;
        med.amount = '10';
        med.unit = null;
        med.current = true;
        meds.add(med);
        GPCaseService.saveMedications(c.Id, meds);

        List<GPCaseService.SubstanceInput> subs = new List<GPCaseService.SubstanceInput>();
        GPCaseService.SubstanceInput sub = new GPCaseService.SubstanceInput();
        sub.catalogName = 'Substance A';
        sub.catalogCategory = null;
        sub.frequency = null;
        sub.current = true;
        subs.add(sub);
        GPCaseService.saveSubstances(c.Id, subs);

        List<GPCaseService.ScreenerInput> screeners = new List<GPCaseService.ScreenerInput>();
        GPCaseService.ScreenerInput scr = new GPCaseService.ScreenerInput();
        scr.catalogName = 'Screener A';
        scr.catalogType = null;
        scr.screenedDate = String.valueOf(Date.today());
        scr.score = '5';
        scr.positive = true;
        screeners.add(scr);
        GPCaseService.saveScreeners(c.Id, screeners);

        List<GPCaseService.ConcernInput> concerns = new List<GPCaseService.ConcernInput>();
        GPCaseService.ConcernInput con = new GPCaseService.ConcernInput();
        con.label = 'Concern A';
        con.category = null;
        con.notes = 'Note';
        con.source = 'Manual';
        concerns.add(con);
        GPCaseService.saveConcerns(c.Id, concerns, true);

        List<GPCaseService.SafetyRiskInput> risks = new List<GPCaseService.SafetyRiskInput>();
        GPCaseService.SafetyRiskInput risk = new GPCaseService.SafetyRiskInput();
        risk.catalogName = 'Risk A';
        risk.catalogCategory = null;
        risk.recent = true;
        risk.notes = 'Note';
        risk.source = 'Manual';
        risks.add(risk);
        GPCaseService.saveSafetyRisks(c.Id, risks);

        List<GPCaseService.SupportInput> supports = new List<GPCaseService.SupportInput>();
        GPCaseService.SupportInput sup = new GPCaseService.SupportInput();
        sup.supportName = 'Support A';
        sup.notes = 'Notes';
        sup.scheduled = true;
        supports.add(sup);
        GPCaseService.savePatientSupports(c.Id, supports);

        Map<String, Object> payload = GPCaseService.getCaseFullData(c.Id);
        System.assert(((List<Object>)payload.get('medications')).size() > 0);
        System.assert(((List<Object>)payload.get('substances')).size() > 0);
        System.assert(((List<Object>)payload.get('screeners')).size() > 0);
        System.assert(((List<Object>)payload.get('concerns')).size() > 0);
        System.assert(((List<Object>)payload.get('safetyRisks')).size() > 0);
        System.assert(((Map<String, Object>)payload.get('presenting')).containsKey('Impairment_Level__c'));
    }

    @IsTest
    static void testGetCaseFullDataFreshAndPatientSupports() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Fresh', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.SupportInput sup = new GPCaseService.SupportInput();
        sup.supportName = 'Support A';
        sup.scheduled = true;
        GPCaseService.savePatientSupports(c.Id, new List<GPCaseService.SupportInput>{ sup });

        Map<String, Object> payload = GPCaseService.getCaseFullDataFresh(c.Id);
        System.assert(((List<Object>)payload.get('supports')).size() >= 0);

        List<Map<String, Object>> supports = GPCaseService.getPatientSupports(c.Id, 'k');
        System.assertEquals(1, supports.size());
    }

    @IsTest
    static void testSavePatientSupportsDeletesMissing() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Supports', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.SupportInput sup1 = new GPCaseService.SupportInput();
        sup1.supportName = 'Support A';
        sup1.scheduled = true;

        GPCaseService.SupportInput sup2 = new GPCaseService.SupportInput();
        sup2.supportName = 'Support A';
        sup2.going = true;

        GPCaseService.savePatientSupports(c.Id, new List<GPCaseService.SupportInput>{ sup1 });
        System.assertEquals(1, [
            SELECT count() FROM Patient_Support__c WHERE Case__c = :c.Id
        ]);

        GPCaseService.savePatientSupports(c.Id, new List<GPCaseService.SupportInput>{});
        System.assertEquals(0, [
            SELECT count() FROM Patient_Support__c WHERE Case__c = :c.Id
        ]);
    }

    @IsTest
    static void testSaveMedicationsInvalidAmount() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Med', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.MedicationInput med = new GPCaseService.MedicationInput();
        med.catalogName = 'Medication A';
        med.amount = 'bad';

        Boolean thrown = false;
        try {
            GPCaseService.saveMedications(c.Id, new List<GPCaseService.MedicationInput>{ med });
        } catch (AuraHandledException ex) {
            thrown = true;
        }
        System.assert(thrown, 'Invalid amount should throw.');
    }

    @IsTest
    static void testSaveScreenersInvalidDate() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Scr', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.ScreenerInput scr = new GPCaseService.ScreenerInput();
        scr.catalogName = 'Screener A';
        scr.screenedDate = 'bad-date';

        Boolean thrown = false;
        try {
            GPCaseService.saveScreeners(c.Id, new List<GPCaseService.ScreenerInput>{ scr });
        } catch (AuraHandledException ex) {
            thrown = true;
        }
        System.assert(thrown, 'Invalid date should throw.');
    }

    @IsTest
    static void testSaveConcernsDeleteMissing() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Concerns', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.ConcernInput con = new GPCaseService.ConcernInput();
        con.label = 'Concern A';
        con.category = null;
        GPCaseService.saveConcerns(c.Id, new List<GPCaseService.ConcernInput>{ con }, true);

        System.assertEquals(1, [
            SELECT count() FROM Patient_Concern__c WHERE Case__c = :c.Id
        ]);

        GPCaseService.saveConcerns(c.Id, new List<GPCaseService.ConcernInput>(), true);
        System.assertEquals(0, [
            SELECT count() FROM Patient_Concern__c WHERE Case__c = :c.Id
        ]);
    }

    @IsTest
    static void testSaveSafetyRisksDeleteMissing() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Risks', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        GPCaseService.SafetyRiskInput risk = new GPCaseService.SafetyRiskInput();
        risk.catalogName = 'Risk A';
        risk.catalogCategory = null;
        risk.recent = true;
        GPCaseService.saveSafetyRisks(c.Id, new List<GPCaseService.SafetyRiskInput>{ risk });

        System.assertEquals(1, [
            SELECT count() FROM Patient_Safety_Risk__c WHERE Case__c = :c.Id
        ]);

        GPCaseService.saveSafetyRisks(c.Id, new List<GPCaseService.SafetyRiskInput>());
        System.assertEquals(0, [
            SELECT count() FROM Patient_Safety_Risk__c WHERE Case__c = :c.Id
        ]);
    }

    @IsTest
    static void testUpsertChild() {
        Account practice = [SELECT Id FROM Account WHERE Name = 'Practice' LIMIT 1];
        Contact patient = [SELECT Id FROM Contact WHERE LastName = 'Patient' LIMIT 1];
        Case c = new Case(Subject = 'Upsert', Status = 'New', AccountId = practice.Id, ContactId = patient.Id);
        insert c;

        Id concernId = [SELECT Id FROM Concern_List__c WHERE Name = 'Concern A' LIMIT 1].Id;
        Map<String, Object> recordData = new Map<String, Object>{
            'Concern__c' => concernId,
            'Notes_new__c' => 'Note'
        };
        Id newId = GPCaseService.upsertChild('Patient_Concern__c', recordData, c.Id);
        System.assertNotEquals(null, newId);
    }
}