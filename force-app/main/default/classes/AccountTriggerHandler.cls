/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * Handles Account trigger logic and delegates specific operations.
 * Currently responsible for setting the Account Sync ID before insert.
 */
public with sharing class AccountTriggerHandler {

    /**
     * Handles before-insert operations for Account records.
     * @param newAccounts List of newly inserted Account records.
     */
    public void handleBeforeInsert(List<Account> newAccounts) {
        this.populateAccountSyncId(newAccounts);
    }

    /**
     * Handles after-insert operations for Account records.
     * @param newAccounts List of newly inserted Account records.
     */
    public void handleAfterInsert(List<Account> newAccounts) {
        List<Account> accountsWithoutSyncIds = new List<Account>();
        for (Account newAccount : newAccounts) {
            if (String.isBlank(newAccount.AccountSync_Id__c)) {
                accountsWithoutSyncIds.add(
                        new Account(Id = newAccount.Id)
                );
            }
        }
        this.populateAccountSyncId(accountsWithoutSyncIds);
        Database.update(accountsWithoutSyncIds);
    }

    /**
     * Populates the Account Sync ID for the given records.
     * @param accountRecords List of Account records to update.
     */
    private void populateAccountSyncId(List<Account> accountRecords) {
        new AccountSyncService().setAccountSyncId(accountRecords);
    }
}