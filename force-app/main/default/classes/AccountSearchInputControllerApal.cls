public with sharing class AccountSearchInputControllerApal {

    private static AccountSelectorApal accountSelector = new AccountSelectorApal();
    private static AccountSyncServiceApal accountSyncService = new AccountSyncServiceApal();

    private static String INPUT_HELP_TEXT_SYNC_ENABLED = 'Search by name, NPI, email, or phone. You can also select a provider from the VMAP system or create a new one if not found.';
    private static String INPUT_HELP_TEXT_SYNC_DISABLED = 'Search by name, NPI, email, or phone. Create a new provider if no match is found.';

 
    @AuraEnabled(Cacheable=true)
    public static String getInputHelpTextContent() {
        return AccountSyncUtilApal.isAccountSyncActive()
                ? INPUT_HELP_TEXT_SYNC_ENABLED
                : INPUT_HELP_TEXT_SYNC_DISABLED;
    }

    @AuraEnabled
    public static AccountRetrieveResult retrieveAllAccounts() {
        List<Account> accounts = getLocalAccounts();
        AccountRetrieveResult accountRetrieveResult = new AccountRetrieveResult(
                accounts,
                true
        );
        if (AccountSyncUtilApal.isAccountSyncActive()) {
            try {
                accountRetrieveResult.accounts.addAll(
                        accountSyncService.getExternalAccounts()
                );
            } catch (Exception ex) {
                accountRetrieveResult.isExternalRetrieveSuccessful = false;
            }
        }
        return accountRetrieveResult;
    }

    @AuraEnabled
    public static void updateCaseWithNewAccount(Id accountId, Id caseId) {
        System.debug('Account ID: ' + accountId);
        System.debug('Case ID: ' + caseId);
        try {
            update new Case(
                    Id = caseId,
                    Provider__c = accountId
            );
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }


    @AuraEnabled
    public static ExternalAccountCreator.OutputWrapper createNewExternalAccount(Account accountRecord) {
        System.debug('PROVIDER ID: ' + accountRecord.Id);
        System.debug('PROVIDER: ' + accountRecord);

        List<ExternalAccountCreator.InputWrapper> inputs = new List<ExternalAccountCreator.InputWrapper>();

        ExternalAccountCreator.InputWrapper wrapper = new ExternalAccountCreator.InputWrapper();
        wrapper.account = accountRecord;
        inputs.add(wrapper);

        List<ExternalAccountCreator.OutputWrapper> results = ExternalAccountCreator.insertAccounts(inputs);
        return results[0];
    }

   @AuraEnabled(cacheable=false)
public static Account getCurrentAccountRecord(Id recordId) {
    if (String.isBlank(recordId)) {
        return null;
    }

    Case caseRecord = [
        SELECT Id,
               Provider__c,
               Provider__r.Id,
               Provider__r.FirstName,
               Provider__r.LastName,
               Provider__r.AccountSync_Id__c,
               Provider__r.pcpnpi__c,
               Provider__r.Phone,
               Provider__r.PersonEmail
        FROM Case
        WHERE Id = :recordId
    ];

    System.debug('CASE RECORD: ' + caseRecord);
    System.debug('PROVIDER ID: ' + caseRecord.Provider__c);
    System.debug('PROVIDER: ' + caseRecord.Provider__r);

    if (caseRecord.Provider__c != null && caseRecord.Provider__r != null) {
        return caseRecord.Provider__r;
    }

    return null;
}


    private static List<Account> getLocalAccounts() {
        return accountSelector.queryAllPersonAccounts();
    }

    public class AccountRetrieveResult {
        @AuraEnabled
        public List<Account> accounts;
        @AuraEnabled
        public Boolean isExternalRetrieveSuccessful;

        public AccountRetrieveResult(List<Account> accounts, Boolean isExternalRetrieveSuccessful) {
            this.accounts = accounts;
            this.isExternalRetrieveSuccessful = isExternalRetrieveSuccessful;
        }
    }
}