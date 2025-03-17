/**
 * @author Artem Shevchenko
 * @date 02.27.2025
 *
 * Web service for handling Account synchronization requests.
 * This service receives account change events, processes them, and logs errors if any occur.
 */
@RestResource(UrlMapping='/AccountSync')
global with sharing class AccountSyncWebService {

    private static AccountSyncService syncService = new AccountSyncService();
    private static CalloutService restService = new CalloutService();
    private static AccountSyncLogger syncLogger = AccountSyncLogger.getInstance();

    private static AccountSyncUtil.RequestWrapper syncRequest;

    /**
     * @description Handles incoming POST requests for Account synchronization.
     * Parses the request body, and delegates processing to the sync service.
     * If an error occurs, it logs the failure and returns an error response.
     */
    @HttpPost
    global static void handleAccountSync() {
        RestResponse response = RestContext.response;
        try {
            if (AccountSyncUtil.isAccountSyncActive()) {
                syncRequest = new AccountSyncUtil.RequestWrapper(RestContext.request.requestBody);
                syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_SYNC_REQUEST, syncRequest);
                syncService.handleAccountSync(syncRequest);
            }
        } catch (Exception ex) {
            syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_EXCEPTION_MESSAGE, ex.getMessage());
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
            syncLogger.setDebug(AccountSyncUtil.DEBUG_HEADER_EXCEPTION_MESSAGE, queryException.getMessage());
        }

        AccountSyncLogger.LogInstance logInstance = syncLogger.createFailedLog(ex)
                .setSyncId(syncRequest?.accountSyncId)
                .setDirection(AccountSyncUtil.APAL_PREFIX)
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