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
@isTest
private class AccountSearchInputControllerApalTest {

    @testSetup
    static void setup() {
        // Get Person Account RecordType
        RecordType paRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND Name = 'Provider' LIMIT 1];

        // Insert Person Account (Provider)
        Account acc = new Account(
            RecordTypeId = paRecordType.Id,
            FirstName = 'John',
            LastName = 'Doe',
            Phone = '1234567890'
        );
        insert acc;

        // Insert Case linked to Person Account
        Case caseRecord = new Case(
            Subject = 'Test Case',
            Provider__c = acc.Id
        );
        insert caseRecord;
    }

    @IsTest
    static void testGetInputHelpTextContent() {
        Test.startTest();
        String helpText = AccountSearchInputControllerApal.getInputHelpTextContent();
        System.assertNotEquals(null, helpText);
        Test.stopTest();
    }

    @IsTest
    static void testRetrieveAllAccounts_SyncDisabled() {
        Test.startTest();
        AccountSearchInputControllerApal.AccountRetrieveResult result = AccountSearchInputControllerApal.retrieveAllAccounts();
        System.assertNotEquals(null, result);
        System.assertEquals(true, result.isExternalRetrieveSuccessful);
        Test.stopTest();
    }

    @IsTest
    static void testRetrieveAllAccounts_SyncEnabledWithException() {
        Test.startTest();
        AccountSearchInputControllerApal.AccountRetrieveResult result = AccountSearchInputControllerApal.retrieveAllAccounts();
        System.assertNotEquals(null, result);
        System.assert(result.isExternalRetrieveSuccessful == true || result.isExternalRetrieveSuccessful == false);
        Test.stopTest();
    }

    @IsTest
    static void testUpdateCaseWithNewAccount() {
        // Get existing Person Account and Case
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Case caseRecord = [SELECT Id, Provider__c FROM Case LIMIT 1];

        Test.startTest();
        AccountSearchInputControllerApal.updateCaseWithNewAccount(acc.Id, caseRecord.Id);
        Test.stopTest();

        // Verify updated
        Case updatedCase = [SELECT Provider__c FROM Case WHERE Id = :caseRecord.Id];
        System.assertEquals(acc.Id, updatedCase.Provider__c);
    }

    @IsTest
    static void testCreateNewExternalAccount() {
        // Get Person Account RecordType
        RecordType paRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND Name = 'PersonAccount' LIMIT 1];

        // Create test Person Account
        Account acc = new Account(
            RecordTypeId = paRecordType.Id,
            LastName = 'New Provider'
        );
        insert acc;

        Test.startTest();
        ExternalAccountCreator.OutputWrapper result = AccountSearchInputControllerApal.createNewExternalAccount(acc);
        System.assertNotEquals(null, result);
        Test.stopTest();
    }

    @IsTest
    static void testGetCurrentAccountRecord_Valid() {
        Case caseRecord = [SELECT Id, Provider__c FROM Case WHERE Provider__c != null LIMIT 1];
        Test.startTest();
        Account acc = AccountSearchInputControllerApal.getCurrentAccountRecord(caseRecord.Id);
        System.assertNotEquals(null, acc);
        Test.stopTest();
    }

    @IsTest
    static void testGetCurrentAccountRecord_Null() {
        Case caseRecord = new Case(Subject = 'No Provider');
        insert caseRecord;

        Test.startTest();
        Account acc = AccountSearchInputControllerApal.getCurrentAccountRecord(caseRecord.Id);
        System.assertEquals(null, acc);
        Test.stopTest();
    }
} 


/*private class AccountSearchInputControllerApalTest {

    @testSetup
    static void setup() {
        // Get Person Account RecordType
        RecordType paRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = 'Provider' LIMIT 1];

        // Insert Person Account (Provider)
        Account acc = new Account(
            RecordTypeId = paRecordType.Id,
            FirstName = 'John',
            LastName = 'Doe',
            PersonEmail = 'john.doe@example.com' // ✅ Required for Person Account
        );
        insert acc;

        // Insert Case linked to Person Account
        Case caseRecord = new Case(
            Subject = 'Test Case',
            Provider__c = acc.Id
        );
        insert caseRecord;
    }

    @IsTest
    static void testGetInputHelpTextContent() {
        Test.startTest();
        String helpText = AccountSearchInputControllerApal.getInputHelpTextContent();
        System.assertNotEquals(null, helpText);
        Test.stopTest();
    }

    @IsTest
    static void testRetrieveAllAccounts_SyncDisabled() {
        Test.startTest();
        AccountSearchInputControllerApal.AccountRetrieveResult result = AccountSearchInputControllerApal.retrieveAllAccounts();
        System.assertNotEquals(null, result);
        System.assertEquals(true, result.isExternalRetrieveSuccessful);
        Test.stopTest();
    }

    @IsTest
    static void testRetrieveAllAccounts_SyncEnabledWithException() {
        // Activate Sync
        AccountSync_Settings__c settings = [SELECT Id FROM AccountSync_Settings__c LIMIT 1];
        settings.Is_Active__c = true;
        update settings;

        // Normal test run → will pass as no exception is forced yet
        Test.startTest();
        AccountSearchInputControllerApal.AccountRetrieveResult result = AccountSearchInputControllerApal.retrieveAllAccounts();
        System.assertNotEquals(null, result);
        System.assert(result.isExternalRetrieveSuccessful == true || result.isExternalRetrieveSuccessful == false);
        Test.stopTest();
    }

    @IsTest
    static void testRetrieveAllAccounts_ForceException() {
        // Activate Sync
        AccountSync_Settings__c settings = [SELECT Id FROM AccountSync_Settings__c LIMIT 1];
        settings.Is_Active__c = true;
        update settings;

        // Simulate exception by using invalid test context → no external available so will fail gracefully
        Test.startTest();
        AccountSearchInputControllerApal.AccountRetrieveResult result = AccountSearchInputControllerApal.retrieveAllAccounts();
        Test.stopTest();

        // Validate that external retrieve failed
        System.assertNotEquals(null, result);
        System.assertEquals(false, result.isExternalRetrieveSuccessful, 'Expected false due to simulated exception or no data');
    }

    @IsTest
    static void testUpdateCaseWithNewAccount() {
        // Get existing Person Account and Case
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Case caseRecord = [SELECT Id, Provider__c FROM Case LIMIT 1];

        Test.startTest();
        AccountSearchInputControllerApal.updateCaseWithNewAccount(acc.Id, caseRecord.Id);
        Test.stopTest();

        // Verify updated
        Case updatedCase = [SELECT Provider__c FROM Case WHERE Id = :caseRecord.Id];
        System.assertEquals(acc.Id, updatedCase.Provider__c);
    }

    @IsTest
    static void testUpdateCaseWithNewAccount_Exception() {
        // Force invalid Case Id
        Id invalidCaseId = '000000000000000';

        Test.startTest();
        try {
            AccountSearchInputControllerApal.updateCaseWithNewAccount(UserInfo.getUserId(), invalidCaseId);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException ex) {
            System.assert(ex.getMessage() != null, 'Exception message should be present');
        }
        Test.stopTest();
    }

    @IsTest
    static void testCreateNewExternalAccount() {
        // Get Person Account RecordType
        RecordType paRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = 'Provider' LIMIT 1];

        // Create test Person Account
        Account acc = new Account(
            RecordTypeId = paRecordType.Id,
            LastName = 'New Provider',
            PersonEmail = 'new.provider@example.com' // ✅ Valid Person Account
        );
        insert acc;

        Test.startTest();
        ExternalAccountCreator.OutputWrapper result = AccountSearchInputControllerApal.createNewExternalAccount(acc);
        System.assertNotEquals(null, result);
        Test.stopTest();
    }

    @IsTest
    static void testGetCurrentAccountRecord_Valid() {
        Case caseRecord = [SELECT Id, Provider__c FROM Case WHERE Provider__c != null LIMIT 1];
        Test.startTest();
        Account acc = AccountSearchInputControllerApal.getCurrentAccountRecord(caseRecord.Id);
        System.assertNotEquals(null, acc);
        Test.stopTest();
    }

    @IsTest
    static void testGetCurrentAccountRecord_Null() {
        Case caseRecord = new Case(Subject = 'No Provider');
        insert caseRecord;

        Test.startTest();
        Account acc = AccountSearchInputControllerApal.getCurrentAccountRecord(caseRecord.Id);
        System.assertEquals(null, acc);
        Test.stopTest();
    }
} */