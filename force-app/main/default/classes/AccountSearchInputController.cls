/**
 * Created by ArtemShevchenko on 25.03.2025.
 */

public with sharing class AccountSearchInputController {

    private static AccountSelector accountSelector = new AccountSelector();
    private static AccountSyncService accountSyncService = new AccountSyncService();

    private static String INPUT_HELP_TEXT_SYNC_ENABLED = 'Search by name, NPI, email, or phone. You can also select a provider from the APAL system or create a new one if not found.';
    private static String INPUT_HELP_TEXT_SYNC_DISABLED = 'Search by name, NPI, email, or phone. Create a new provider if no match is found.';

    @AuraEnabled(Cacheable=true)
    public static String getInputHelpTextContent() {
        return AccountSyncUtil.isAccountSyncActive()
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
        if (AccountSyncUtil.isAccountSyncActive()) {
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