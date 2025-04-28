/**
 * Created by ArtemShevchenko on 31.03.2025.
 */

public with sharing class ExternalAccountCreator {
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

        for (InputWrapper input : inputList) {
            OutputWrapper result = new OutputWrapper();
            try {
                Account newAccount = input.account;
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