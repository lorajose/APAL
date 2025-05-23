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
private class AccountChangeEventTriggerHandlerTest {

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

        AccountChangeEventTriggerHandler.throwTestException = true;

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
}