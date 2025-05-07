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
private class AccountSelectorTest {
    @IsTest
    private static void queryByIdsTest() {
        Account testAccountRecord = new Account(
                Name = 'Test Account',
                Phone = '123-456-7890'
        );

        insert testAccountRecord;

        Test.startTest();

        List<Account> accountRecords = new AccountSelector().queryByIds(new Set<Id>{
                testAccountRecord.Id
        });

        Test.stopTest();

        System.assertEquals(
                1,
                accountRecords.size(),
                'Just one test account record should be queried'
        );
    }

    @IsTest
    private static void queryByAccountSyncIdTest() {
        Account testAccountRecord = new Account(
                Name = 'Test Account',
                Phone = '123-456-7890'
        );

        insert testAccountRecord;

        Account queriedTestAccountRecord = [
                SELECT Id, AccountSync_Id__c
                FROM Account
                WHERE Id = :testAccountRecord.Id
                LIMIT 1
        ];

        Test.startTest();

        Account accountRecordQueriedBySelector = new AccountSelector().queryByAccountSyncId(
                queriedTestAccountRecord.AccountSync_Id__c
        );

        Test.stopTest();

        System.assert(
                accountRecordQueriedBySelector != null,
                'Account record should be queried by selector'
        );
    }
}