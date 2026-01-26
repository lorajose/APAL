@IsTest
private class CasePracticePatientHandlerTest {
    @testSetup
    static void setup() {
        Account a1 = new Account(Name = 'Practice A');
        Account a2 = new Account(Name = 'Practice B');
        insert new List<Account>{ a1, a2 };

        Contact c1 = new Contact(LastName = 'Patient One');
        Contact c2 = new Contact(LastName = 'Patient Two');
        insert new List<Contact>{ c1, c2 };
    }

    @IsTest
    static void createsOnInsert() {
        Account a = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Contact c = [SELECT Id FROM Contact WHERE LastName = 'Patient One' LIMIT 1];

        Case cs = new Case(Subject = 'Insert Case', AccountId = a.Id, ContactId = c.Id);
        insert cs;

        String key = a.Id + '-' + c.Id;
        List<Practice_Patient__c> rows = [
            SELECT Id, PracticePatientKey__c, Practice__c, Patient__c
            FROM Practice_Patient__c
            WHERE PracticePatientKey__c = :key
        ];
        System.assertEquals(1, rows.size(), 'Should create Practice_Patient__c on insert.');
        System.assertEquals(a.Id, rows[0].Practice__c);
        System.assertEquals(c.Id, rows[0].Patient__c);
    }

    @IsTest
    static void createsOnUpdateWhenFieldsAdded() {
        Account a = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Contact c = [SELECT Id FROM Contact WHERE LastName = 'Patient Two' LIMIT 1];

        Case cs = new Case(Subject = 'Update Case');
        insert cs;

        cs.AccountId = a.Id;
        cs.ContactId = c.Id;
        update cs;

        String key = a.Id + '-' + c.Id;
        System.assertEquals(1, [
            SELECT count()
            FROM Practice_Patient__c
            WHERE PracticePatientKey__c = :key
        ]);
    }

    @IsTest
    static void updatesOnChangeAndCleansOldWhenLast() {
        Account a1 = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Account a2 = [SELECT Id FROM Account WHERE Name = 'Practice B' LIMIT 1];
        Contact c1 = [SELECT Id FROM Contact WHERE LastName = 'Patient One' LIMIT 1];

        Case cs = new Case(Subject = 'Change Case', AccountId = a1.Id, ContactId = c1.Id);
        insert cs;

        cs.AccountId = a2.Id;
        update cs;

        String oldKey = a1.Id + '-' + c1.Id;
        String newKey = a2.Id + '-' + c1.Id;

        System.assertEquals(0, [
            SELECT count() FROM Practice_Patient__c WHERE PracticePatientKey__c = :oldKey
        ]);
        System.assertEquals(1, [
            SELECT count() FROM Practice_Patient__c WHERE PracticePatientKey__c = :newKey
        ]);
    }

    @IsTest
    static void doesNotDeleteWhenOtherCasesRemain() {
        Account a1 = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Contact c1 = [SELECT Id FROM Contact WHERE LastName = 'Patient One' LIMIT 1];

        Case cA = new Case(Subject = 'Case A', AccountId = a1.Id, ContactId = c1.Id);
        Case cB = new Case(Subject = 'Case B', AccountId = a1.Id, ContactId = c1.Id);
        insert new List<Case>{ cA, cB };

        delete cA;

        String key = a1.Id + '-' + c1.Id;
        System.assertEquals(1, [
            SELECT count() FROM Practice_Patient__c WHERE PracticePatientKey__c = :key
        ]);
    }

    @IsTest
    static void cleansOnFieldClear() {
        Account a1 = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Contact c2 = [SELECT Id FROM Contact WHERE LastName = 'Patient Two' LIMIT 1];

        Case cs = new Case(Subject = 'Clear Fields', AccountId = a1.Id, ContactId = c2.Id);
        insert cs;

        cs.ContactId = null;
        update cs;

        String key = a1.Id + '-' + c2.Id;
        System.assertEquals(0, [
            SELECT count() FROM Practice_Patient__c WHERE PracticePatientKey__c = :key
        ]);
    }

    @IsTest
    static void bulkInsertAndDelete() {
        Account a1 = [SELECT Id FROM Account WHERE Name = 'Practice A' LIMIT 1];
        Account a2 = [SELECT Id FROM Account WHERE Name = 'Practice B' LIMIT 1];
        Contact c1 = [SELECT Id FROM Contact WHERE LastName = 'Patient One' LIMIT 1];
        Contact c2 = [SELECT Id FROM Contact WHERE LastName = 'Patient Two' LIMIT 1];

        List<Case> cases = new List<Case>();
        for (Integer i = 0; i < 200; i++) {
            Id acc = (Math.mod(i, 2) == 0) ? a1.Id : a2.Id;
            Id con = (Math.mod(i, 2) == 0) ? c1.Id : c2.Id;
            cases.add(new Case(Subject = 'Bulk ' + i, AccountId = acc, ContactId = con));
        }
        insert cases;

        System.assertEquals(2, [
            SELECT count() FROM Practice_Patient__c
        ]);

        delete cases;

        System.assertEquals(0, [
            SELECT count() FROM Practice_Patient__c
        ]);
    }
}