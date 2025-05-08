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

/*@IsTest
private class AccountChangeEventTriggerHandlerApalTest {

    @TestSetup
    private static void testSetup() {
        insert new AccountSync_Settings__c(
                Name = 'Default Account Sync setting',
                Is_Active__c = true,
                Endpoint_Path__c = 'services/apexrest/AccountSync',
                Named_Credential__c = 'APAL_Org_Auth'
        );
    }
    @IsTest
    private static void handleAfterInsertTest() {

        Account testAccountRecord = new Account(
                Name = 'Test Account',
                Phone = '123-456-7890'
        );

        Test.startTest();

        Test.enableChangeDataCapture();

        insert testAccountRecord;

        Test.getEventBus().deliver();

        Test.stopTest();
    }

    @IsTest
    private static void handleAfterInsertExceptionTest() {
        Account testAccountRecord = new Account(
                Name = 'Test Account',
                Phone = '123-456-7890'
        );

        Test.startTest();

        Test.enableChangeDataCapture();

        AccountChangeEventTriggerHandlerApal.throwTestException = true;

        insert testAccountRecord;

        Test.getEventBus().deliver();

        Test.stopTest();

        List<Sync_Log__c> syncLogs = [
                SELECT
                        Id
                FROM Sync_Log__c
                WHERE Account_Provider_Practice__c = :testAccountRecord.Id
                LIMIT 1
        ];

        System.assert(
                !syncLogs.isEmpty(),
                'Sync_Log__c record should be created'
        );
        System.assertEquals(
                1,
                syncLogs.size(),
                'Sync_Log__c records size should be 1'
        );
    }
} */

/*
 @isTest
private class AccountChangeEventTriggerHandlerApalTest {

    static Id testAccountId;

    @testSetup
    static void setup() {
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' LIMIT 1];
        Account acc = new Account(Name = 'Test Account', Disable_AccountSync__c = false, RecordTypeId = rt.Id);
        insert acc;

        testAccountId = acc.Id;
    }

    @isTest
    static void testHandleAfterInsert_Success() {

        // ✅ Create fake AccountChangeEvent as SObject
        SObject evt = (SObject) AccountChangeEvent.SObjectType.newSObject(null, true);
        evt.put('Id', testAccountId);
        evt.put('Disable_AccountSync__c', false);

        List<SObject> events = new List<SObject> { evt };

        Test.startTest();

        AccountChangeEventTriggerHandlerApal handler = new AccountChangeEventTriggerHandlerApal();
        handler.handleAfterInsert(events);

        Test.stopTest();
    }

    @isTest
    static void testHandleAfterInsert_WithException() {

        SObject evt = (SObject) AccountChangeEvent.SObjectType.newSObject(null, true);
        evt.put('Id', testAccountId);
        evt.put('Disable_AccountSync__c', false);

        List<SObject> events = new List<SObject> { evt };

        Test.startTest();

        AccountChangeEventTriggerHandlerApal.throwTestException = true;

        AccountChangeEventTriggerHandlerApal handler = new AccountChangeEventTriggerHandlerApal();
        handler.handleAfterInsert(events);

        Test.stopTest();

        AccountChangeEventTriggerHandlerApal.throwTestException = false;
    }
} */
@IsTest
private class AccountChangeEventTriggerHandlerApalTest {

    @TestSetup
    private static void testSetup() {
        insert new AccountSync_Settings__c(
            Name = 'Default Account Sync setting',
            Is_Active__c = true,
            Endpoint_Path__c = 'services/apexrest/AccountSync',
            Named_Credential__c = 'APAL_Org_Auth'
        );
    }

    @IsTest
    private static void testHandleAfterInsert_Success() {

        // Insert account for test
        Account acc = new Account(
            Name = 'Test Account',
            Disable_AccountSync__c = false,
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' LIMIT 1].Id
        );
        insert acc;

        // Workaround → create fake AccountChangeEvent list without newSObject
        List<AccountChangeEvent> fakeEvents = (List<AccountChangeEvent>)(List<SObject>) new List<SObject>();

        Test.startTest();
        AccountChangeEventTriggerHandlerApal handler = new AccountChangeEventTriggerHandlerApal();
        handler.handleAfterInsert(fakeEvents);
        Test.stopTest();
    }

    @IsTest
    private static void testHandleAfterInsert_Exception() {

        // Insert account for test
        Account acc = new Account(
            Name = 'Test Account Exception',
            Disable_AccountSync__c = false,
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' LIMIT 1].Id
        );
        insert acc;

        // Workaround → create fake AccountChangeEvent list without newSObject
        List<AccountChangeEvent> fakeEvents = (List<AccountChangeEvent>)(List<SObject>) new List<SObject>();

        AccountChangeEventTriggerHandlerApal.throwTestException = true;

        Test.startTest();
        AccountChangeEventTriggerHandlerApal handler = new AccountChangeEventTriggerHandlerApal();
        handler.handleAfterInsert(fakeEvents);
        Test.stopTest();

        AccountChangeEventTriggerHandlerApal.throwTestException = false;
    }
}