/**
 * @author Artem Shevchenko
 * @date 02.24.2025
 *
 * @description Handles Account Change Data Capture (CDC) events and triggers synchronization if enabled.
 * Filters events based on change type and the `Disable_AccountSync__c` flag before processing.
 */
public with sharing class AccountChangeEventTriggerHandler {

    private static AccountSyncLogger syncLogger = AccountSyncLogger.getInstance();
    private static AccountSyncService syncService = new AccountSyncService();

    @TestVisible
    private static Boolean throwTestException = false;

    /**
    * @description processes Account Change Events and triggers sync if enabled.
    * @param newAccountChangeEvents List of AccountChangeEvent records.
    */
    public void handleAfterInsert(List<AccountChangeEvent> newAccountChangeEvents) {
        if (AccountSyncUtil.isAccountSyncActive()) {
            try {
                this.syncAccounts(newAccountChangeEvents);
            } catch (Exception ex) {
                this.handleException(ex, newAccountChangeEvents);
            }
        }
    }

    /**
    * @description filters relevant events and sends them for synchronization.
    * @param accountChangeEvents List of AccountChangeEvent records.
    */
    private void syncAccounts(List<AccountChangeEvent> accountChangeEvents) {
        List<AccountChangeEvent> accountChangeEventsToSync = this.filterAccountChangeEvents(
                accountChangeEvents
        );

        if (Test.isRunningTest() && throwTestException) {
            throw new AccountSyncException.RecordNotFoundException(AccountSyncUtil.EXCEPTION_MESSAGE_RECORD_NOT_FOUND);
        }

        if (!accountChangeEventsToSync.isEmpty()) {
            syncService.executeAccountSync(accountChangeEventsToSync);
        }
    }

    private List<AccountChangeEvent> filterAccountChangeEvents(List<AccountChangeEvent> accountChangeEvents) {
        List<AccountChangeEvent> accountChangeEventsToSync = new List<AccountChangeEvent>();
        Map<String, Account> accountsByChangeEventIds = syncService.getAccountsByChangeEventIds(accountChangeEvents);

        for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
            if ((!accountChangeEvent.Disable_AccountSync__c && !accountsByChangeEventIds.get(accountChangeEvent.Id).Disable_AccountSync__c)
                    && !syncService.shouldBypassSync(accountChangeEvent)
                    && AccountSyncUtil.isRecordTypeInSyncSetting(accountsByChangeEventIds.get(accountChangeEvent.Id))
                    && AccountSyncUtil.isAccountSyncAllowedInCurrentMode(accountsByChangeEventIds.get(accountChangeEvent.Id))
                    && AccountSyncUtil.CDC_EVENTS_TO_TRACK.contains(accountChangeEvent.ChangeEventHeader.getChangeType())
            ) {
                syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_CHANGE_EVENT, accountChangeEvent);
                accountChangeEventsToSync.add(accountChangeEvent);
            }
        }

        return accountChangeEventsToSync;
    }

    @TestVisible
    private void handleException(Exception ex, List<AccountChangeEvent> newAccountChangeEvents) {
        List<AccountSyncLogger.LogInstance> logInstances = new List<AccountSyncLogger.LogInstance>();
        Map<Id, Id> getAccountIdsByChangeEventIds = syncService.getAccountIdsByChangeEventIds(newAccountChangeEvents);
        for (AccountChangeEvent accountChangeEvent : newAccountChangeEvents) {
            logInstances.add(syncLogger.createFailedLog(ex)
                    .setRecordId(getAccountIdsByChangeEventIds.get(accountChangeEvent.Id))
                    .setDirection(AccountSyncUtil.VMAP_PREFIX)
                    .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                    .setInitiator(AccountSyncUtil.getCommitUser(accountChangeEvent))
                    .setPayload(accountChangeEvent)
            );
        }

        syncLogger.commitLogs(logInstances);
    }
}