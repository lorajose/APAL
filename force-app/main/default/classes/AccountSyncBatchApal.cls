public with sharing class AccountSyncBatchApal implements Database.Batchable<AccountChangeEvent>, Database.AllowsCallouts, Database.Stateful {

    private List<AccountChangeEvent> accountChangeEvents;
    private Map<String, Account> accountsByChangeEventIds;
    private CalloutService calloutService;
    private AccountSyncLoggerApal syncLogger;
    private List<AccountSyncLoggerApal.LogInstance> logInstances = new List<AccountSyncLoggerApal.LogInstance>();

    /**
     * @description Initializes the batch process with a list of AccountChangeEvent records
     * and their corresponding AccountSync IDs.
     *
     * @param accountChangeEvents The list of AccountChangeEvent records to process.
     * @param accountsByChangeEventIds A map associating AccountChangeEvent IDs with their corresponding Account records.
     */
    public AccountSyncBatchApal(List<AccountChangeEvent> accountChangeEvents, Map<String, Account> accountsByChangeEventIds) {
        this.accountChangeEvents = accountChangeEvents;
        this.accountsByChangeEventIds = accountsByChangeEventIds;
        this.calloutService = new CalloutService();
        syncLogger = AccountSyncLoggerApal.getInstance();
    }

    /**
     * @description Defines the batchable scope by returning the list of AccountChangeEvent records.
     * @param batchContext The batchable context.
     * @return Iterable list of AccountChangeEvent records.
     */
    public Iterable<AccountChangeEvent> start(Database.BatchableContext batchContext) {
        return this.accountChangeEvents;
    }

    /**
     * @description Executes the batch operation, sending HTTP requests for each AccountChangeEvent record.
     * @param batchContext The batchable context.
     * @param accountChangeEvents The list of AccountChangeEvent records to process in this batch execution.
     */
    public void execute(Database.BatchableContext batchContext, List<AccountChangeEvent> accountChangeEvents) {
        for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
            CalloutService.RequestInstance request;
            try {
                request = calloutService.createPOSTRequest()
                        .setEndpoint(AccountSyncUtilApal.buildSyncEndpoint())
                        .setBody(AccountSyncUtilApal.buildRequestBody(
                                this.accountsByChangeEventIds.get(accountChangeEvent.Id),
                                accountChangeEvent

                        ));

                HttpResponse response = calloutService.sendRequest(request);

                logInstances.add(
                        syncLogger.logSyncResponse(
                                response, accountChangeEvent, this.accountsByChangeEventIds.get(accountChangeEvent.Id).AccountSync_Id__c
                        )
                );

                syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_CALLOUT_RESPONSE, response.getStatusCode());
                syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_CALLOUT_RESPONSE, response.getBody());
            } catch (Exception ex) {
                syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_EXCEPTION_MESSAGE, ex.getMessage());
                logInstances.add(syncLogger.createFailedLog(ex)
                        .setSyncId(this.accountsByChangeEventIds.get(accountChangeEvent.Id).AccountSync_Id__c)
                        .setRecordId(accountChangeEvent.ChangeEventHeader.getRecordIds()[0])
                        .setDirection(AccountSyncUtilApal.APAL_PREFIX)
                        .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                        .setInitiator(AccountSyncUtilApal.getCommitUser(accountChangeEvent))
                        .setPayload(request.request.getBody())
                );
            }
        }
    }

    /**
     * @description Finalizes batch execution. Can be used for logging or post-processing.
     * @param batchContext The batchable context.
     */
    public void finish(Database.BatchableContext batchContext) {
        if (!logInstances.isEmpty()) {
            syncLogger.commitLogs(logInstances);
        }
    }
}