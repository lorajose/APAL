/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * @description A batchable class that processes Account Change Data Capture (CDC) events and
 * synchronizes them with an external system using HTTP callouts.
 *
 * Implements `Database.Batchable<AccountChangeEvent>` for bulk processing 
 * and `Database.AllowsCallouts` to enable callouts within batch execution.
 */
public with sharing class AccountSyncBatch implements Database.Batchable<AccountChangeEvent>, Database.AllowsCallouts, Database.Stateful {

    private List<AccountChangeEvent> accountChangeEvents;
    private Map<String, Account> accountsByChangeEventIds;
    private CalloutService calloutService;
    private AccountSyncLogger syncLogger;
    private List<AccountSyncLogger.LogInstance> logInstances = new List<AccountSyncLogger.LogInstance>();

    /**
     * @description Initializes the batch process with a list of AccountChangeEvent records
     * and their corresponding AccountSync IDs.
     *
     * @param accountChangeEvents The list of AccountChangeEvent records to process.
     * @param accountsByChangeEventIds A map associating AccountChangeEvent IDs with their corresponding Account records.
     */
    public AccountSyncBatch(List<AccountChangeEvent> accountChangeEvents, Map<String, Account> accountsByChangeEventIds) {
        this.accountChangeEvents = accountChangeEvents;
        this.accountsByChangeEventIds = accountsByChangeEventIds;
        this.calloutService = new CalloutService();
        syncLogger = AccountSyncLogger.getInstance();
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
        System.debug('🔥 AccountSyncBatch.execute() - Processing batch of size: ' + accountChangeEvents.size());
        for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
            CalloutService.RequestInstance request;
            try {
                request = calloutService.createPOSTRequest()
                        .setEndpoint(AccountSyncUtil.buildSyncEndpoint())
                        .setBody(AccountSyncUtil.buildRequestBody(
                                this.accountsByChangeEventIds.get(accountChangeEvent.Id),
                                accountChangeEvent

                        ));

                HttpResponse response = calloutService.sendRequest(request);

                logInstances.add(
                        syncLogger.logSyncResponse(
                                response, accountChangeEvent, this.accountsByChangeEventIds.get(accountChangeEvent.Id).AccountSync_Id__c
                        )
                );

                syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_CALLOUT_RESPONSE, response.getStatusCode());
                syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_CALLOUT_RESPONSE, response.getBody());
            } catch (Exception ex) {
                syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_EXCEPTION_MESSAGE, ex.getMessage());
                logInstances.add(syncLogger.createFailedLog(ex)
                        .setSyncId(this.accountsByChangeEventIds.get(accountChangeEvent.Id).AccountSync_Id__c)
                        .setRecordId(accountChangeEvent.ChangeEventHeader.getRecordIds()[0])
                        .setDirection(AccountSyncUtil.VMAP_PREFIX)
                        .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                        .setInitiator(AccountSyncUtil.getCommitUser(accountChangeEvent))
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