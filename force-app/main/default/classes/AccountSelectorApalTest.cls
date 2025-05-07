@isTest
private class AccountSelectorApalTest {

    private static RecordType personAccountRecordType;
    private static RecordType businessAccountRecordType;

    @testSetup
    static void setupTestData() {

        personAccountRecordType = [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = :AccountSyncUtilApal.PERSON_ACCOUNT_RECORD_TYPE_DEVELOPER_NAME LIMIT 1];

        if (personAccountRecordType == null) {
            List<RecordType> fallbackTypes = [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account' LIMIT 1];
            if (!fallbackTypes.isEmpty()) {
                personAccountRecordType = fallbackTypes[0];
            }
        }

        List<RecordType> businessTypes = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND Id != :personAccountRecordType.Id LIMIT 1];
        if (!businessTypes.isEmpty()) {
            businessAccountRecordType = businessTypes[0];
        }

        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < 205; i++) {
            accounts.add(new Account(
                RecordTypeId = personAccountRecordType.Id,
                FirstName = 'PA First ' + i,
                LastName = 'PA Last ' + i,
                PersonEmail = 'pa' + i + '@email.com',
                Phone = '555-1234',
                pcpnpi__c = '999999999',
                AccountSync_Id__c = 'SYNC-PA-' + i
            ));
        }

        if (businessAccountRecordType != null) {
            for (Integer i = 0; i < 50; i++) {
                accounts.add(new Account(
                    RecordTypeId = businessAccountRecordType.Id,
                    Name = 'Business Account ' + i,
                    Phone = '555-9999',
                    AccountSync_Id__c = 'SYNC-BIZ-' + i
                ));
            }
        }

        insert accounts;
    }

  /*  @isTest
    static void testQueryAllPersonAccounts() {
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        List<Account> results = selector.queryAllPersonAccounts();
        Test.stopTest();
        System.assert(results.size() >= 205, 'Expected at least 205 PersonAccounts');
        for (Account acc : results) {
            System.assertEquals(personAccountRecordType.DeveloperName, acc.RecordType.DeveloperName, 'Expected RecordType to be PersonAccount');
        }
    } */

@isTest
static void testQueryAllPersonAccounts() {
    // Step 1: Prepare test data - insert at least 205 Person Accounts
    List<Account> personAccounts = new List<Account>();
    Id personAccountRecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1].Id;

    for (Integer i = 0; i < 205; i++) {
        personAccounts.add(new Account(
            FirstName = 'Test',
            LastName = 'Person ' + i,
            RecordTypeId = personAccountRecordTypeId
        ));
    }
    insert personAccounts;

    // Step 2: Execute the selector
    AccountSelectorApal selector = new AccountSelectorApal();

    Test.startTest();
    List<Account> results = selector.queryAllPersonAccounts();
    Test.stopTest();

    // Step 3: Validate count
    System.assert(results.size() >= 205, 'Expected at least 205 PersonAccounts');

    // Step 4: Re-query the results to load RecordType.DeveloperName to avoid NullPointer + SOQL per-record load
    List<Account> accountsWithRecordType = [
        SELECT Id, RecordTypeId, RecordType.DeveloperName
        FROM Account
        WHERE Id IN :results
    ];

    RecordType personAccountRecordType = [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1];

    // Step 5: Assert RecordType.DeveloperName
    for (Account acc : accountsWithRecordType) {
        System.assertEquals(personAccountRecordType.DeveloperName, acc.RecordType.DeveloperName, 'Expected RecordType to be PersonAccount');
    }
}



    @isTest
    static void testQueryByIds_SingleAndBulk() {
        List<Account> allAccounts = [SELECT Id FROM Account];
        Set<Id> ids = new Set<Id>();
        for (Integer i = 0; i < allAccounts.size() && i < 200; i++) {
            ids.add(allAccounts[i].Id);
        }
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        List<Account> results = selector.queryByIds(ids);
        Test.stopTest();
        System.assertEquals(ids.size(), results.size(), 'Expected results to match input ids count');
    }

    @isTest
    static void testQueryByIds_EmptySet() {
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        List<Account> results = selector.queryByIds(new Set<Id>());
        Test.stopTest();
        System.assertEquals(0, results.size(), 'Expected empty result');
    }

  /*  @isTest
    static void testQueryByAccountSyncId_Valid() {
        Account acc = [SELECT AccountSync_Id__c FROM Account WHERE RecordTypeId = :personAccountRecordType.Id LIMIT 1];
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        Account result = selector.queryByAccountSyncId(acc.AccountSync_Id__c);
        Test.stopTest();
        System.assertNotEquals(null, result, 'Expected to find Account by AccountSync_Id__c');
        System.assertEquals(acc.AccountSync_Id__c, result.AccountSync_Id__c, 'Expected match on AccountSync_Id__c');
    } */
   @isTest
static void testQueryByAccountSyncId_Valid() {
    // Prepare Person Account RecordType
    RecordType personAccountRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1];

    // Insert Person Account with AccountSync_Id__c
    Account insertedAcc = new Account(
        FirstName = 'Test',
        LastName = 'Person',
        RecordTypeId = personAccountRecordType.Id,
        AccountSync_Id__c = 'SYNC123456'
    );
    insert insertedAcc;

    AccountSelectorApal selector = new AccountSelectorApal();

    Test.startTest();
    Account result = selector.queryByAccountSyncId(insertedAcc.AccountSync_Id__c);
    Test.stopTest();

    System.assertNotEquals(null, result, 'Expected to find Account by AccountSync_Id__c');
    System.assertEquals(insertedAcc.AccountSync_Id__c, result.AccountSync_Id__c, 'Expected match on AccountSync_Id__c');
}


    

    @isTest
    static void testQueryByAccountSyncId_NotExisting() {
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        Account result = selector.queryByAccountSyncId('SYNC-NOT-EXISTS');
        Test.stopTest();
        System.assertEquals(null, result, 'Expected null for non-existing AccountSync_Id__c');
    }

   /* @isTest
    static void testQueryByAccountSyncId_NullAndBlank() {
        AccountSelectorApal selector = new AccountSelectorApal();
        Test.startTest();
        Account resultNull = selector.queryByAccountSyncId(null);
        Test.stopTest();
        System.assertEquals(null, resultNull, 'Expected null for null input');
        Test.startTest();
        Account resultBlank = selector.queryByAccountSyncId('');
        Test.stopTest();
        System.assertEquals(null, resultBlank, 'Expected null for blank input');
    } */
   @isTest
static void testQueryByAccountSyncId_NullAndBlank() {
    AccountSelectorApal selector = new AccountSelectorApal();

    Test.startTest();
    Account resultNull = selector.queryByAccountSyncId(null);
    Account resultBlank = selector.queryByAccountSyncId('');
    Test.stopTest();

    System.assertEquals(null, resultNull, 'Expected null for null input');
    System.assertEquals(null, resultBlank, 'Expected null for blank input');
}


    @isTest
    static void testBuildDynamicExternalQuery() {
        AccountSelectorApal selector = new AccountSelectorApal();
        Set<String> fieldNames = new Set<String>{ 'FirstName', 'LastName', 'PersonEmail' };
        String query = selector.buildDynamicExternalQuery(fieldNames);
        System.assert(query.contains('AccountSync_Id__c'), 'Expected AccountSync_Id__c');
        System.assert(query.contains('FirstName'), 'Expected FirstName');
        System.assert(query.contains('LastName'), 'Expected LastName');
        System.assert(query.contains('PersonEmail'), 'Expected PersonEmail');
    }
}