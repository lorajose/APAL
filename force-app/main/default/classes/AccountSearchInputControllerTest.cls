@IsTest
private class AccountSearchInputControllerTest {

    @IsTest
    private static void testGetInputHelpTextContent() {
        Test.startTest();
        String result = AccountSearchInputController.getInputHelpTextContent();
        Test.stopTest();

        System.assertNotEquals(null, result);
    }

    @IsTest
    private static void testRetrieveAllAccounts() {
        Account acc = new Account(LastName = 'TestLocal', RecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('PersonAccount').getRecordTypeId());
        insert acc;

        Test.startTest();
        AccountSearchInputController.AccountRetrieveResult result = AccountSearchInputController.retrieveAllAccounts();
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertNotEquals(null, result.accounts);
        System.assert(result.accounts.size() >= 1);
    }

    @IsTest
    private static void testUpdateCaseWithNewAccount() {
        Account acc = new Account(LastName = 'Test');
        insert acc;

        Case c = new Case(Subject = 'Test Case');
        insert c;

        Test.startTest();
        AccountSearchInputController.updateCaseWithNewAccount(acc.Id, c.Id);
        Test.stopTest();

        Case updated = [SELECT AccountId FROM Case WHERE Id = :c.Id];
        System.assertEquals(acc.Id, updated.AccountId);
    }

    @IsTest
    private static void testCreateNewExternalAccount() {
        Account acc = new Account(LastName = 'External Test');
        Test.startTest();
        ExternalAccountCreator.OutputWrapper result = AccountSearchInputController.createNewExternalAccount(acc);
        Test.stopTest();

        System.assertEquals(true, result.success);
        System.assertEquals('Account inserted successfully.', result.message);
        System.assertNotEquals(null, result.accountId);
    }

    @IsTest
    private static void testGetCurrentAccountRecord_whenAccountExists() {
        Account acc = new Account(LastName = 'Attached User');
        insert acc;

        Case c = new Case(Subject = 'With Account', AccountId = acc.Id);
        insert c;

        Test.startTest();
        Account result = AccountSearchInputController.getCurrentAccountRecord(c.Id);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals(acc.Id, result.Id);
    }

    @IsTest
    private static void testGetCurrentAccountRecord_whenNoAccount() {
        Case c = new Case(Subject = 'No Account');
        insert c;

        Test.startTest();
        Account result = AccountSearchInputController.getCurrentAccountRecord(c.Id);
        Test.stopTest();

        System.assertEquals(null, result);
    }

    @IsTest
    private static void testGetCurrentAccountRecord_withBlankId() {
        Test.startTest();
        Account result = AccountSearchInputController.getCurrentAccountRecord(null);
        Test.stopTest();

        System.assertEquals(null, result);
    }
}