@IsTest
private class ExternalAccountCreatorTest {

    @IsTest
    private static void testInsertAccountSuccess() {
        Account testAcc = new Account(
                Name = 'Test Account'
        );

        ExternalAccountCreator.InputWrapper input = new ExternalAccountCreator.InputWrapper();
        input.account = testAcc;

        List<ExternalAccountCreator.InputWrapper> inputs = new List<ExternalAccountCreator.InputWrapper>{
                input
        };

        Test.startTest();
        List<ExternalAccountCreator.OutputWrapper> results = ExternalAccountCreator.insertAccounts(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals(true, results[0].success);
        System.assertEquals('Account inserted successfully.', results[0].message);
        System.assertNotEquals(null, results[0].accountId);

        Account inserted = [SELECT On_Demand_AccountSync__c FROM Account WHERE Id = :results[0].accountId];
        System.assertEquals(true, inserted.On_Demand_AccountSync__c);
    }

    @IsTest
    private static void testInsertAccountFailure() {
        Account badAcc = new Account();

        ExternalAccountCreator.InputWrapper input = new ExternalAccountCreator.InputWrapper();
        input.account = badAcc;

        List<ExternalAccountCreator.InputWrapper> inputs = new List<ExternalAccountCreator.InputWrapper>{
                input
        };

        Test.startTest();
        List<ExternalAccountCreator.OutputWrapper> results = ExternalAccountCreator.insertAccounts(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals(false, results[0].success);
        System.assert(results[0].message.startsWith('Insert failed'));
        System.assertEquals(null, results[0].accountId);
    }
}