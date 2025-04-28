@RestResource(UrlMapping='/AccountSyncApal')
global with sharing class AccountSyncWebServiceApal {
      private static AccountSyncServiceApal syncService = new AccountSyncServiceApal();
    private static CalloutService restService = new CalloutService();
    private static AccountSyncLoggerApal syncLogger = AccountSyncLoggerApal.getInstance();

    private static AccountSyncUtilApal.RequestWrapper syncRequest;

    /**
     * @description Handles incoming POST requests for Account synchronization.
     * Parses the request body, and delegates processing to the sync service.
     * If an error occurs, it logs the failure and returns an error response.
     */
    @HttpPost
    global static void handleAccountSync() {
        RestResponse response = RestContext.response;
        try {
            if (AccountSyncUtilApal.isAccountSyncActive()) {
                syncRequest = new AccountSyncUtilApal.RequestWrapper(RestContext.request.requestBody);
                syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_SYNC_REQUEST, syncRequest);
                syncService.handleAccountSync(syncRequest);
            }
        } catch (Exception ex) {
            syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_EXCEPTION_MESSAGE, ex.getMessage());
            handleException(ex, response);
        }
    }

    /**
     * @description Handles exceptions during the synchronization process.
     * Logs the error details and sets the appropriate HTTP response.
     * @param ex The exception that occurred during processing.
     * @param response Current Rest Response.
     */
    private static void handleException(Exception ex, RestResponse response) {
        Account existingAccount;
        try {
            existingAccount = new AccountSelector().queryByAccountSyncId(syncRequest?.accountSyncId);
        } catch (Exception queryException) {
            syncLogger.setDebug(AccountSyncUtilApal.DEBUG_HEADER_EXCEPTION_MESSAGE, queryException.getMessage());
        }

        AccountSyncLoggerApal.LogInstance logInstance = syncLogger.createFailedLog(ex)
                .setSyncId(syncRequest?.accountSyncId)
                .setDirection(AccountSyncUtilApal.VMAP_PREFIX)
                .setRecordId(existingAccount?.Id)
                .setType(syncRequest?.changeType)
                .setInitiator(syncRequest?.syncInitiatorName)
                .setPayload(RestContext.request.requestBody.toString());

        restService.setRestResponse(
                CalloutService.STATUS_CODE_400, logInstance.log, response
        );

        syncLogger.commitLog(logInstance);
    }
}