public with sharing class ExternalAccountCreatorApal {
    public class InputWrapper {
        @InvocableVariable(Required=true)
        public Account account;
    }

    public class OutputWrapper {
        @AuraEnabled
        @InvocableVariable
        public Boolean success;
        @AuraEnabled
        @InvocableVariable
        public String message;
        @AuraEnabled
        @InvocableVariable
        public Id accountId;
    }

    @InvocableMethod(Label='Insert Account' Description='Inserts an Account from Flow and returns status, message, and Id')
    public static List<OutputWrapper> insertAccounts(List<InputWrapper> inputList) {
        List<OutputWrapper> results = new List<OutputWrapper>();
        System.debug('Input List: ' + inputList);
        System.debug('Input List Size: ' + inputList.size());

        for (InputWrapper input : inputList) {
            OutputWrapper result = new OutputWrapper();
            try {
                System.debug('Input Account: ' + input.account);
                Account newAccount = input.account;
                System.debug('New Account: ' + newAccount);
                System.debug('New Account Id: ' + newAccount.Id);
                System.debug('New Account Name: ' + newAccount.Name);
                System.debug('New Account Type: ' + newAccount.Type);
                insert newAccount;
                result.success = true;
                result.message = 'Account inserted successfully.';
                result.accountId = input.account.Id;
                enableOnDemandSync(newAccount.Id);
            } catch (Exception e) {
                result.success = false;
                result.message = 'Insert failed: ' + e.getMessage();
                result.accountId = null;
            }
            results.add(result);
        }

        return results;
    }

    @Future
    public static void enableOnDemandSync(Id accountId) {
        update new Account(
                Id = accountId,
                On_Demand_AccountSync__c = true
        );
    }
}