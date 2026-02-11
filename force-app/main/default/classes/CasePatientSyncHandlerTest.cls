@IsTest
private class CasePatientSyncHandlerTest {
    @testSetup
    static void setupData() {
        // RecordType for Case optional; create basic data
        Account practice = new Account(Name = 'Practice A');
        insert practice;

        Contact patientOld = buildContact('Old');
        insert patientOld;
        Contact patientNew = buildContact('New');
        insert patientNew;

        Case c = new Case(Subject = 'Test', Status = 'New', AccountId = practice.Id, ContactId = patientOld.Id);
        insert c;

        Patient_Support__c ps = new Patient_Support__c(Case__c = c.Id, Support__c = createSupport().Id);
        ps.put('Patient__c', patientOld.Id);
        insert ps;

        CasePatientSyncHandlerTestCache.ids = new Id[] { c.Id, ps.Id, patientOld.Id, patientNew.Id, practice.Id };
    }

    private static Support__c createSupport() {
        Support__c s = new Support__c(Name = 'Support X');
        Map<String, Schema.SObjectField> fields = Support__c.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('Active__c')) {
            s.put('Active__c', true);
        }
        if (fields.containsKey('General_Psychiatry__c')) {
            s.put('General_Psychiatry__c', true);
        }
        if (fields.containsKey('Addiction_Services__c')) {
            s.put('Addiction_Services__c', true);
        }
        if (fields.containsKey('Category__c')) {
            String val = firstPicklistValue(fields.get('Category__c'));
            if (val != null) s.put('Category__c', val);
        }
        if (fields.containsKey('API_Key__c')) {
            s.put('API_Key__c', 'TEST-KEY-SUPPORT');
        }
        try {
            insert s;
            return s;
        } catch (DmlException ex) {
            // Fallback: use any existing Support__c if creation fails due to org validations
            Support__c existing = [SELECT Id FROM Support__c LIMIT 1];
            System.assertNotEquals(null, existing, 'Support insert failed and no fallback support available: ' + ex.getMessage());
            return existing;
        }
    }

    private static Contact buildContact(String first) {
        Contact c = new Contact(FirstName = first, LastName = 'Patient');
        Map<String, Schema.SObjectField> fields = Contact.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('yinsurance_v2__c')) {
            String insuranceValue = firstPicklistValue(fields.get('yinsurance_v2__c'));
            if (insuranceValue != null) {
                c.put('yinsurance_v2__c', insuranceValue);
            }
        }
        if (fields.containsKey('API_Key__c')) {
            c.put('API_Key__c', 'TEST-KEY-' + first);
        }
        return c;
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

    @IsTest
    static void testSyncWhenPatientChanges() {
        List<Id> ids = CasePatientSyncHandlerTestCache.ids;
        Id caseId;
        Id patientOld;
        Id patientNew;
        if (ids != null && ids.size() >= 4) {
            caseId = ids[0];
            patientOld = ids[2];
            patientNew = ids[3];
        } else {
            // Fallback if testSetup was interrupted by org validations: re-query by names.
            Case c = [SELECT Id, ContactId FROM Case WHERE Subject = 'Test' ORDER BY CreatedDate DESC LIMIT 1];
            Contact oldC = [SELECT Id FROM Contact WHERE FirstName = 'Old' AND LastName = 'Patient' ORDER BY CreatedDate DESC LIMIT 1];
            Contact newC = [SELECT Id FROM Contact WHERE FirstName = 'New' AND LastName = 'Patient' ORDER BY CreatedDate DESC LIMIT 1];
            caseId = c.Id;
            patientOld = oldC.Id;
            patientNew = newC.Id;
        }

        Case c = [SELECT Id, ContactId FROM Case WHERE Id = :caseId];
        System.assertEquals(patientOld, c.ContactId);

        // Change patient
        c.ContactId = patientNew;
        update c;

        // Verify Patient_Support__c updated
        Patient_Support__c ps = [
            SELECT Id, Patient__c
            FROM Patient_Support__c
            WHERE Case__c = :caseId
            LIMIT 1
        ];
        System.assertEquals(patientNew, ps.Patient__c, 'Patient__c should sync to new contact');
    }

}