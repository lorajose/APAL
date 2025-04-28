public without sharing  class AccountSyncLoggerApal {
    @TestVisible
    private static final String LOG_STATUS_COMPLETE = 'Complete';
    @TestVisible
    private static final String LOG_STATUS_FAILED = 'Failed';

    private static final String DEBUG_MESSAGE_TEMPLATE = '{0}: {1}';

    private static AccountSyncLoggerApal syncLogger;

    public static AccountSyncLoggerApal getInstance() {
        if (syncLogger == null) {
            syncLogger = new AccountSyncLoggerApal();
        }
        return syncLogger;
    }

    public LogInstance createCompleteLog() {
        return this.createLog(LOG_STATUS_COMPLETE);
    }

    public LogInstance createFailedLog(HttpResponse response, AccountChangeEvent accountChangeEvent, String syncId) {
        try {
            return new LogInstance((Sync_Log__c) JSON.deserialize(
                    response.getBody().toString(), Sync_Log__c.class
            ));
        } catch (Exception ex) {
            return this.createLog(LOG_STATUS_FAILED)
                    .setError(response.getBody().toString())
                    .setSyncId(syncId)
                    .setRecordId(accountChangeEvent.ChangeEventHeader.getRecordIds()[0])
                    .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                    .setInitiator(AccountSyncUtilApal.getCommitUser(accountChangeEvent))
                    .setDirection(AccountSyncUtilApal.APAL_PREFIX)
                    .setPayload(accountChangeEvent);
        }
    }

    public LogInstance createFailedLog(Exception ex) {
        return this.createLog(LOG_STATUS_FAILED)
                .setError(ex.getMessage())
                .setStackTrace(ex.getStackTraceString());
    }

    public void commitLog(LogInstance logInstance) {
        this.commitLogs(new List<LogInstance>{
                logInstance
        });
    }

    public void commitLogs(List<LogInstance> logInstances) {
        List<Sync_Log__c> syncLogs = new List<Sync_Log__c>();
        for (LogInstance logInstance : logInstances) {
            syncLogs.add(logInstance.log);
        }
        try {
            if (syncLogs != null && !syncLogs.isEmpty()) {
                Database.insert(syncLogs);
            }
        } catch (Exception ex) {
            this.setDebug(AccountSyncUtilApal.DEBUG_HEADER_EXCEPTION_MESSAGE, ex.getMessage());
        }
    }

    public void setDebug(String debugHeader, Object debugValue) {
        this.setDebug(debugHeader, JSON.serializePretty(debugValue));
    }

    public void setDebug(String debugHeader, String debugValue) {
        System.debug(
                LoggingLevel.INFO,
                String.format(DEBUG_MESSAGE_TEMPLATE, new List<String>{
                        debugHeader, debugValue
                })
        );
    }

    public LogInstance logSyncResponse(HttpResponse synResponse, AccountChangeEvent accountChangeEvent, String syncId) {
        LogInstance synResponseLog;
        if (synResponse.getStatusCode() == CalloutService.STATUS_CODE_200) {
            synResponseLog = this.createCompleteLog()
                    .setSyncId(syncId)
                    .setRecordId(Id.valueOf(accountChangeEvent.ChangeEventHeader.getRecordIds()[0]))
                    .setType(accountChangeEvent.ChangeEventHeader.getChangeType())
                    .setInitiator(AccountSyncUtilApal.getCommitUser(accountChangeEvent))
                    .setDirection(AccountSyncUtilApal.APAL_PREFIX)
                    .setPayload(accountChangeEvent);
        } else {
            synResponseLog = this.createFailedLog(synResponse, accountChangeEvent, syncId)
                    .setRecordId(Id.valueOf(accountChangeEvent.ChangeEventHeader.getRecordIds()[0]))
                    .setInitiator(AccountSyncUtilApal.getCommitUser(accountChangeEvent));
        }
        return synResponseLog;
    }

    private LogInstance createLog(String logStatus) {
        return new LogInstance(logStatus);
    }

    public class LogInstance {

        public Sync_Log__c log;

        public LogInstance(Sync_Log__c log) {
            this.log = log;
        }
        public LogInstance(String logStatus) {
            this.log = new Sync_Log__c(
                    Status__c = logStatus,
                    LastAttempted__c = Datetime.now()
            );
        }

        public LogInstance setSyncId(String syncId) {
            this.log.External_Account_ID__c = syncId;
            return this;
        }

        public LogInstance setRecordId(Id recordId) {
            this.log.Account_Provider_Practice__c = recordId;
            return this;
        }

        public LogInstance setError(String errorMessage) {
            this.log.Error_Message__c = errorMessage.length() > 255 ? errorMessage.substring(0, 255) : errorMessage;
            return this;
        }
        public LogInstance setStackTrace(String stackTrace) {
            this.log.Stack_Trace__c = stackTrace;
            return this;
        }
        public LogInstance setPayload(String payload) {
            this.log.Data_Payload_Json__c = JSON.serializePretty(JSON.deserializeUntyped(payload));
            return this;
        }

        public LogInstance setPayload(Object payload) {
            this.log.Data_Payload_Json__c = JSON.serializePretty(payload);
            return this;
        }

        public LogInstance setDirection(String direction) {
            this.log.Sync_Direction__c = direction.toUpperCase();
            return this;
        }

        public LogInstance setType(String type) {
            this.log.Sync_Type__c = type;
            return this;
        }

        public LogInstance setInitiator(String initiatorName) {
            this.log.Sync_Initiator__c = initiatorName;
            return this;
        }

        public LogInstance setInitiator(User initiator) {
            this.log.Sync_Initiator__c = initiator?.Name;
            this.log.Sync_Initiator_Lookup__c = initiator?.Id;
            return this;
        }
    }
}