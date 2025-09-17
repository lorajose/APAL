public with sharing class AccountChangeEventTriggerHandlerApal {

    private static AccountSyncLoggerApal syncLogger = AccountSyncLoggerApal.getInstance();
    private static AccountSyncServiceApal syncService = new AccountSyncServiceApal();

    @TestVisible
    private static Boolean throwTestException = false;

    /**
    * @description processes Account Change Events and triggers sync if enabled.
    * @param newAccountChangeEvents List of AccountChangeEvent records.
    */
    public void handleAfterInsert(List<AccountChangeEvent> newAccountChangeEvents) {
        if (AccountSyncUtilApal.isAccountSyncActive()) {
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
            throw new AccountSyncException.RecordNotFoundException(AccountSyncUtilApal.EXCEPTION_MESSAGE_RECORD_NOT_FOUND);
        }

        if (!accountChangeEventsToSync.isEmpty()) {
            syncService.executeAccountSync(accountChangeEventsToSync);
        }
    }

    private List<AccountChangeEvent> filterAccountChangeEvents(List<AccountChangeEvent> accountChangeEvents) {
        List<AccountChangeEvent> accountChangeEventsToSync = new List<AccountChangeEvent>();
        Map<String, Account> accountsByChangeEventIds = syncService.getAccountsByChangeEventIds(accountChangeEvents);

        System.debug('change events --> ' + JSON.serializePretty(accountChangeEvents));

         for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
            if ((!accountChangeEvent.Disable_AccountSync__c && (accountsByChangeEventIds.containsKey(accountChangeEvent.Id) && !accountsByChangeEventIds.get(accountChangeEvent.Id).Disable_AccountSync__c))
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
        List<AccountSyncLoggerApal.LogInstance> logInstances = new List<AccountSyncLoggerApal.LogInstance>();
        Map<Id, Id> getAccountIdsByChangeEventIds = syncService.getAccountIdsByChangeEventIds(newAccountChangeEvents);
        for (AccountChangeEvent accountChangeEvent : newAccountChangeEvents) {
            logInstances.add(syncLogger.createFailedLog(ex)
                    .setRecordId(getAccountIdsByChangeEventIds.get(accountChangeEvent.Id))
                    .setDirection(AccountSyncUtilApal.APAL_PREFIX)
                    .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                    .setInitiator(AccountSyncUtilApal.getCommitUser(accountChangeEvent))
                    .setPayload(accountChangeEvent)
            );
        }

        syncLogger.commitLogs(logInstances);
    }
}