@IsTest
private class CasePCQTSyncServiceTest {
    @testSetup
    static void setupData() {
        Account practice = new Account(Name = 'Practice-PCQT-Sync');
        insert practice;

        Contact patient = buildContact('Sync');
        insert patient;

        Case c = new Case(
            Subject = 'Sync Case',
            Status = 'New',
            AccountId = practice.Id,
            ContactId = patient.Id
        );
        insert c;

        List<String> allowed = getAllowedPicklistValues();
        String generalName = allowed.isEmpty() ? 'Sync General' : allowed[0];
        String addictionName = allowed.size() > 1 ? allowed[1] : generalName;

        // Catalog entries
        PCQT__c general = ensurePcqt(generalName, true, false);
        PCQT__c addiction = ensurePcqt(addictionName, false, true);

        CasePCQTSyncServiceTestCache.caseId = c.Id;
        CasePCQTSyncServiceTestCache.generalId = general.Id;
        CasePCQTSyncServiceTestCache.addictionId = addiction.Id;
        CasePCQTSyncServiceTestCache.generalName = generalName;
        CasePCQTSyncServiceTestCache.addictionName = addictionName;
    }

    @IsTest
    static void testSyncFromCaseCreatesJunctions() {
        Case c = fetchCaseOrAny();
        Id caseId = c.Id;
        Id gen = CasePCQTSyncServiceTestCache.generalId;
        Id add = CasePCQTSyncServiceTestCache.addictionId;

        if (gen == null || add == null) {
            List<PCQT__c> pcqts = [SELECT Id, Name FROM PCQT__c ORDER BY CreatedDate DESC LIMIT 2];
            if (!pcqts.isEmpty()) gen = pcqts[0].Id;
            if (pcqts.size() > 1) add = pcqts[1].Id;
            if (!pcqts.isEmpty()) CasePCQTSyncServiceTestCache.generalName = pcqts[0].Name;
            if (pcqts.size() > 1) CasePCQTSyncServiceTestCache.addictionName = pcqts[1].Name;
        }
        System.assertNotEquals(null, gen, 'Need general PCQT id');
        System.assertNotEquals(null, add, 'Need addiction PCQT id');

        String genName = CasePCQTSyncServiceTestCache.generalName;
        String addName = CasePCQTSyncServiceTestCache.addictionName;

        Case oldCase = new Case(Id = caseId, Primary_Clinical_Question_Types__c = c.Primary_Clinical_Question_Types__c);
        String picklistValue = (addName != null && addName != genName) ? genName + ';' + addName : genName;
        Case newCase = new Case(Id = caseId, Primary_Clinical_Question_Types__c = picklistValue);

        Test.startTest();
        CasePCQTSyncService.syncFromCase(new List<Case>{ newCase }, new Map<Id, Case>{ caseId => oldCase });
        Test.stopTest();

        List<Case_PCQT__c> rows = [
            SELECT PCQT__c
            FROM Case_PCQT__c
            WHERE Case__c = :caseId
        ];
        Set<Id> ids = new Set<Id>();
        for (Case_PCQT__c r : rows) ids.add(r.PCQT__c);
        System.assert(ids.contains(gen), 'Should create link for general');
        if (add != gen) {
            System.assert(ids.contains(add), 'Should create link for addiction');
        }
    }

    @IsTest
    static void testSyncFromJunctionUpdatesPicklist() {
        Case c = fetchCaseOrAny();
        Id caseId = c.Id;
        Id gen = CasePCQTSyncServiceTestCache.generalId;
        String genName = CasePCQTSyncServiceTestCache.generalName;

        if (gen == null) {
            List<PCQT__c> pcqts = [SELECT Id, Name FROM PCQT__c ORDER BY CreatedDate DESC LIMIT 1];
            if (!pcqts.isEmpty()) {
                gen = pcqts[0].Id;
                genName = pcqts[0].Name;
            }
        }
        System.assertNotEquals(null, gen, 'Need general PCQT id');

        // Insert a junction manually
        insert new Case_PCQT__c(
            Case__c = caseId,
            PCQT__c = gen,
            Case_PCQT_Key__c = caseId + '-' + gen
        );

        Test.startTest();
        CasePCQTSyncService.syncFromJunction(new Set<Id>{ caseId });
        Test.stopTest();

        Case caseRec = [SELECT Primary_Clinical_Question_Types__c FROM Case WHERE Id = :caseId];
        System.assertEquals(genName, caseRec.Primary_Clinical_Question_Types__c);
    }

    /* Helpers */
    private static PCQT__c ensurePcqt(String name, Boolean general, Boolean addiction) {
        PCQT__c rec;
        try {
            rec = [SELECT Id FROM PCQT__c WHERE Name = :name LIMIT 1];
            if (rec != null) return rec;
        } catch (Exception ignore) {}

        rec = new PCQT__c(
            Name = name,
            Active__c = true,
            General_Psychiatry__c = general,
            Addiction_Services__c = addiction
        );
        Map<String, Schema.SObjectField> f = PCQT__c.SObjectType.getDescribe().fields.getMap();
        if (f.containsKey('API_Key__c')) {
            rec.put('API_Key__c', 'API-' + name.replace(' ', '-'));
        }
        insert rec;
        return rec;
    }

    private static String firstPicklistValue(Schema.SObjectField field) {
        if (field == null) return null;
        Schema.DescribeFieldResult d = field.getDescribe();
        if (d == null) return null;
        for (Schema.PicklistEntry e : d.getPicklistValues()) {
            if (e.isActive()) return e.getValue();
        }
        return null;
    }

    private static Contact buildContact(String first) {
        Contact c = new Contact(FirstName = first, LastName = 'Patient');
        Map<String, Schema.SObjectField> fields = Contact.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('yinsurance_v2__c')) {
            String val = firstPicklistValue(fields.get('yinsurance_v2__c'));
            if (val != null) c.put('yinsurance_v2__c', val);
        }
        if (fields.containsKey('API_Key__c')) {
            c.put('API_Key__c', 'TEST-KEY-' + first);
        }
        return c;
    }

    private static List<String> getAllowedPicklistValues() {
        List<String> out = new List<String>();
        Schema.DescribeFieldResult d = Case.Primary_Clinical_Question_Types__c.getDescribe();
        for (Schema.PicklistEntry e : d.getPicklistValues()) {
            if (e.isActive()) out.add(e.getValue());
        }
        return out;
    }

    private static Case fetchCaseOrAny() {
        if (CasePCQTSyncServiceTestCache.caseId != null) {
            try {
                return [SELECT Id, Primary_Clinical_Question_Types__c FROM Case WHERE Id = :CasePCQTSyncServiceTestCache.caseId LIMIT 1];
            } catch (Exception ignore) {}
        }
        return [SELECT Id, Primary_Clinical_Question_Types__c FROM Case ORDER BY CreatedDate DESC LIMIT 1];
    }
}