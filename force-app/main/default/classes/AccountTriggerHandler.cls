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
     * Populates the Account Sync ID for the given records.
     * @param accountRecords List of Account records to update.
     */
    private void populateAccountSyncId(List<Account> accountRecords) {
        new AccountSyncService().setAccountSyncId(accountRecords);
    }
}