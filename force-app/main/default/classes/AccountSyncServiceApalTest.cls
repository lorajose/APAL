/**
 * This class contains unit tests for validating the behavior of Apex classes
 * and triggers.
 *
 * Unit tests are class methods that verify whether a particular piece
 * of code is working properly. Unit test methods take no arguments,
 * commit no data to the database, and are flagged with the testMethod
 * keyword in the method definition.
 *
 * All test methods in an org are executed whenever Apex code is deployed
 * to a production org to confirm correctness, ensure code
 * coverage, and prevent regressions. All Apex classes are
 * required to have at least 75% code coverage in order to be deployed
 * to a production org. In addition, all triggers must have some code coverage.
 * 
 * The @isTest class annotation indicates this class only contains test
 * methods. Classes defined with the @isTest annotation do not count against
 * the org size limit for all Apex scripts.
 *
 * See the Apex Language Reference for more information about Testing and Code Coverage.
 */
@IsTest
private class AccountSyncServiceApalTest {

    // Mock HTTP callout success
    private class MockHttpCallout implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"records":[{"AccountSync_Id__c":"EXT-001"}]}');
            return res;
        }
    }

    @testSetup
    static void setupData() {
        // Get Person Account RecordType
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1];

        // Insert Person Account
        Account acc = new Account(
            RecordTypeId = rt.Id,
            FirstName = 'Test',
            LastName = 'Account',
            AccountSync_Id__c = 'SYNC123'
        );
        insert acc;
    }

    @IsTest
    static void testExecuteAccountSync() {
        // Prepare AccountChangeEvent
        String jsonEvent = '{' +
            '"Id": "a00000000000001AAA",' +
            '"ChangeEventHeader": {"recordIds": ["' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"], "changeType": "UPDATE"},' +
            '"AccountId": "' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);
        List<AccountChangeEvent> events = new List<AccountChangeEvent> { evt };

        Test.startTest();
        new AccountSyncServiceApal().executeAccountSync(events);
        Test.stopTest();
    }

    @IsTest
    static void testHandleAccountSync_InsertAndUpdate() {
        // INSERT SCENARIO
        AccountSyncUtilApal.RequestWrapper req = new AccountSyncUtilApal.RequestWrapper(
            Blob.valueOf('{"accountSyncId":"SYNC-NEW","changeType":"CREATE","changeEvent":{},"personAccountFields":{},"changedFields":[]}')
        );

        Test.startTest();
        AccountSyncServiceApal service = new AccountSyncServiceApal();
        service.handleAccountSync(req);
        Test.stopTest();

        // UPDATE SCENARIO
        Account acc = [SELECT Id, AccountSync_Id__c FROM Account LIMIT 1];

        AccountSyncUtilApal.RequestWrapper reqUpdate = new AccountSyncUtilApal.RequestWrapper(
            Blob.valueOf('{"accountSyncId":"' + acc.AccountSync_Id__c + '","changeType":"UPDATE","changeEvent":{},"personAccountFields":{},"changedFields":[]}')
        );

        Test.startTest();
        service.handleAccountSync(reqUpdate);
        Test.stopTest();
    }

    @IsTest
    static void testGetExternalAccounts() {
        Test.setMock(HttpCalloutMock.class, new MockHttpCallout());

        Test.startTest();
        AccountSyncServiceApal service = new AccountSyncServiceApal();
        List<Account> externalAccounts = service.getExternalAccounts();
        Test.stopTest();

        System.assertEquals(1, externalAccounts.size());
        System.assertEquals('EXT-001', externalAccounts[0].AccountSync_Id__c);
    }

    @IsTest
    static void testShouldBypassSync_CreateAndUpdate() {
        // CREATE EVENT (bypass expected)
        String jsonCreateEvent = '{' +
            '"Id": "a00000000000003AAA",' +
            '"AccountSync_Id__c": "",' +
            '"ChangeEventHeader": {"recordIds": ["001000000000000"], "changeType": "CREATE"}' +
        '}';

        AccountChangeEvent createEvent = (AccountChangeEvent)JSON.deserialize(jsonCreateEvent, AccountChangeEvent.class);

        AccountSyncServiceApal service = new AccountSyncServiceApal();
        Boolean bypassCreate = service.shouldBypassSync(createEvent);
        System.assertEquals(true, bypassCreate);

        // UPDATE EVENT (bypass expected)
        String jsonUpdateEvent = '{' +
            '"Id": "a00000000000004AAA",' +
            '"AccountSync_Bypass__c": true,' +
            '"ChangeEventHeader": {"recordIds": ["001000000000000"], "changeType": "UPDATE"}' +
        '}';

        AccountChangeEvent updateEvent = (AccountChangeEvent)JSON.deserialize(jsonUpdateEvent, AccountChangeEvent.class);
        Boolean bypassUpdate = service.shouldBypassSync(updateEvent);
        System.assertEquals(true, bypassUpdate);
    }

    @IsTest
    static void testSetAccountSyncId() {
        Account acc = new Account(Name = 'No Sync');
        insert acc;

        Account accWithSync = new Account(Name = 'Has Sync', AccountSync_Id__c = 'SYNC-EXIST');
        insert accWithSync;

        List<Account> accList = new List<Account>{acc, accWithSync};

        AccountSyncServiceApal service = new AccountSyncServiceApal();

        Test.startTest();
        service.setAccountSyncId(accList);
        Test.stopTest();

        System.assertNotEquals(null, accList[0].AccountSync_Id__c); // Should be generated
        System.assertEquals('SYNC-EXIST', accList[1].AccountSync_Id__c); // Should stay the same
    }

    @IsTest
    static void testGetAccountIdsByChangeEventIds() {
        String jsonEvent = '{' +
            '"Id": "a00000000000005AAA",' +
            '"ChangeEventHeader": {"recordIds": ["001000000000111"], "changeType": "UPDATE"}' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);
        List<AccountChangeEvent> changeEvents = new List<AccountChangeEvent> { evt };

        AccountSyncServiceApal service = new AccountSyncServiceApal();
        Map<Id, Id> result = service.getAccountIdsByChangeEventIds(changeEvents);

        System.assertEquals(1, result.size());
        System.assertEquals('001000000000111', String.valueOf(result.get(evt.Id)));
    }
}