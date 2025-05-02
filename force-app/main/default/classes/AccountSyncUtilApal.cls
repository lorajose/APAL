public with sharing class AccountSyncUtilApal {
    public static final Integer BATCH_CHUNK_SIZE = 100;
    public static final String VMAP_PREFIX = 'apal'; // vmap
    public static final String APAL_PREFIX = 'vmap'; // apal    
    public static final String REQUEST_PARAM_SYNC_ID = 'accountSyncId';
    public static final String REQUEST_PARAM_CHANGED_FIELDS = 'changedFields';
    public static final String REQUEST_PARAM_CHANGE_EVENT = 'changeEvent';
    public static final String REQUEST_PARAM_PERSON_ACCOUNT_FIELDS = 'personAccountFields';
    public static final String REQUEST_PARAM_CHANGE_TYPE = 'changeType';
    public static final String REQUEST_PARAM_SYNC_INITIATOR_NAME = 'syncInitiatorName';

    public static final String EXTERNAL_ID_TEMPLATE = '{0}-{1}{2}';
    public static final String SYNC_ENDPOINT_TEMPLATE = 'callout:{0}/{1}';
    public static final String QUERY_ENDPOINT_TEMPLATE = 'callout:{0}/{1}{2}';
    public static final String EXTERNAL_SYNC_INITIATOR_NAME_TEMPLATE = '{0} {1}';
    public static final String ENCODING_SCHEME_UTF8 = 'UTF-8';
    public static final String NAME_SUBFIELD_PREFIX = 'Name.';


    public static final String CDC_EVENT_TYPE_CREATE = 'CREATE';
    public static final String CDC_EVENT_TYPE_UPDATE = 'UPDATE';

    public static final String DEBUG_HEADER_SYNC_REQUEST = 'SYNC_REQUEST';
    public static final String DEBUG_HEADER_EXCEPTION_MESSAGE = 'EXCEPTION_MESSAGE';
    public static final String DEBUG_HEADER_CHANGE_EVENT = 'CHANGE_EVENT';
    public static final String DEBUG_HEADER_CALLOUT_RESPONSE = 'CALLOUT_RESPONSE';

    public static final String EXTERNAL_USER_SUFFIX = '[EXT]';

    public static final String PERSON_ACCOUNT_RECORD_TYPE_DEVELOPER_NAME = 'Provider'; //PersonAccount

    public static final String EXCEPTION_MESSAGE_RECORD_DISABLED = 'Account is disabled for synchronization and cannot be updated.';
    public static final String EXCEPTION_MESSAGE_SYNC_IS_NOT_ALLOWED_IN_CURRENT_MODE = 'Account synchronization is not allowed in the current mode. This record is not marked for On-Demand sync.';
    public static final String EXCEPTION_MESSAGE_RECORD_NOT_FOUND = 'Account for synchronization was not found.';

    public static final String SYNC_BYPASS_FIELD_API_NAME = Account.AccountSync_Bypass__c.toString();
    public static final String LAST_MODIFIED_DATE_FIELD_API_NAME = Account.LastModifiedDate.toString();
    public static final String LAST_MODIFIED_BY_ID_FIELD_API_NAME = Account.LastModifiedById.toString();
    public static final String ON_DEMAND_ACCOUNT_SYNC_FIELD_API_NAME = Account.On_Demand_AccountSync__c.toString();
    public static final String NAME_FIELD_API_NAME = Account.Name.toString();

    public static final Set<String> NAME_SUBFIELDS_API_NAMES = new Set<String>{
            Account.Salutation.toString(),
            Account.FirstName.toString(),
            Account.MiddleName.toString(),
            Account.LastName.toString(),
            Account.Suffix.toString()
    };

    public static final Set<String> CDC_EVENTS_TO_TRACK = new Set<String>{
            CDC_EVENT_TYPE_CREATE,
            CDC_EVENT_TYPE_UPDATE
    };

    public static Set<SObjectField> PERSON_ACCOUNT_FIELDS = new Set<SObjectField>{
            Account.PersonEmail
    };

    private static AccountSync_Settings__c syncSettings;
    private static Map<Id, User> commitUserMap = new Map<Id, User>();
    private static UserSelector userSelector = new UserSelector();

    public static Boolean isAccountSyncActive() {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? false : syncSettings.Is_Active__c;
    }

    public static Boolean isRecordTypeInSyncSetting(Account accountRecord) {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? false : syncSettings.Record_Types_to_Sync__c.contains(accountRecord.RecordType.DeveloperName);
    }

    public static Boolean isAccountSyncAllowedInCurrentMode(Account accountRecord) {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? false : syncSettings.On_Demand_Mode__c ? accountRecord.On_Demand_AccountSync__c : true;
    }

    public static String buildSyncEndpoint() {
        return String.format(
                SYNC_ENDPOINT_TEMPLATE,
                new List<String>{
                        getAccountSyncNamedCredentialName(),
                        getAccountSyncEndpointPath()
                }
        );
    }

    public static String buildQueryEndpoint(String queryString) {
        return String.format(
                QUERY_ENDPOINT_TEMPLATE,
                new List<String>{
                        getAccountSyncNamedCredentialName(),
                        getAccountQueryEndpointPath(),
                        EncodingUtil.urlEncode(queryString, ENCODING_SCHEME_UTF8)
                }
        );
    }

    public static String generateAccountSyncId() {
        return String.format(
                EXTERNAL_ID_TEMPLATE,
                new List<String>{
                        VMAP_PREFIX,
                        String.valueOf(System.currentTimeMillis()),
                        String.valueOf(Math.mod(Math.abs(Crypto.getRandomInteger()), 1000000))
                }
        );
    }

    public static String buildRequestBody(Account accountRecord, AccountChangeEvent accountChangeEvent) {
        return JSON.serialize(
                new RequestWrapper(
                        accountRecord,
                        accountChangeEvent
                )
        );
    }

    public static User getCommitUser(AccountChangeEvent accountChangeEvent) {
        Id commitUserId = accountChangeEvent.ChangeEventHeader.getCommitUser();
        if (!commitUserMap.containsKey(commitUserId)) {
            commitUserMap.put(commitUserId, userSelector.queryById(commitUserId));
        }
        return commitUserMap.get(commitUserId);
    }

    public static Boolean isCreateChangeType(AccountChangeEvent accountChangeEvent) {
        return accountChangeEvent.ChangeEventHeader.getChangeType() == CDC_EVENT_TYPE_CREATE;
    }

    public static Boolean isUpdateChangeType(AccountChangeEvent accountChangeEvent) {
        return accountChangeEvent.ChangeEventHeader.getChangeType() == CDC_EVENT_TYPE_UPDATE;
    }


    private static String getAccountSyncEndpointPath() {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? null : syncSettings.Endpoint_Path__c;
    }

    private static String getAccountQueryEndpointPath() {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? null : syncSettings.Query_Endpoint_Path__c;
    }

    private static String getAccountSyncNamedCredentialName() {
        AccountSync_Settings__c syncSettings = getSyncSettings();
        return syncSettings == null ? null : syncSettings.Named_Credential__c;
    }

    private static AccountSync_Settings__c getSyncSettings() {
        if (syncSettings == null) {
            syncSettings = AccountSync_Settings__c.getInstance();
        }

        return syncSettings;
    }

    public class RequestWrapper {

        public String accountSyncId;
        public List<String> changedFields;
        public String changeType;
        public Map<String, Object> changeEvent;
        public Map<String, Object> personAccountFields;
        public String syncInitiatorName;

        public RequestWrapper(Account accountRecord, AccountChangeEvent accountChangeEvent) {
            this.accountSyncId = accountRecord.AccountSync_Id__c;
            this.changedFields = accountChangeEvent.ChangeEventHeader.getChangedFields();
            this.changeType = accountChangeEvent.ChangeEventHeader.getChangeType();
            this.changeEvent = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(accountChangeEvent));
            this.setPersonAccountFields(accountRecord);
            this.syncInitiatorName = AccountSyncUtilApal.getCommitUser(accountChangeEvent)?.Name;
        }

        public RequestWrapper(Blob syncRequestJSONBlob) {
            Map<String, Object> requestMap = (Map<String, Object>) JSON.deserializeUntyped(
                    syncRequestJSONBlob.toString()
            );

            this.accountSyncId = (String) requestMap.get(AccountSyncUtilApal.REQUEST_PARAM_SYNC_ID);
            this.changedFields = new List<String>();
            this.changeType = (String) requestMap.get(AccountSyncUtil.REQUEST_PARAM_CHANGE_TYPE);
            this.changeEvent = (Map<String, Object>) requestMap.get(AccountSyncUtilApal.REQUEST_PARAM_CHANGE_EVENT);
            this.personAccountFields = (Map<String, Object>) requestMap.get(AccountSyncUtilApal.REQUEST_PARAM_PERSON_ACCOUNT_FIELDS);
            this.syncInitiatorName = String.format(EXTERNAL_SYNC_INITIATOR_NAME_TEMPLATE, new List<String>{
                    (String) requestMap.get(AccountSyncUtilApal.REQUEST_PARAM_SYNC_INITIATOR_NAME), EXTERNAL_USER_SUFFIX
            });

            List<Object> rawChangedFields = (List<Object>) requestMap.get(AccountSyncUtilApal.REQUEST_PARAM_CHANGED_FIELDS);

            if (rawChangedFields != null) {
                for (Object field : rawChangedFields) {
                    changedFields.add((String) field);
                }
            }
        }
        public void setPersonAccountFields(Account accountRecord) {
            this.personAccountFields = new Map<String, Object>();
            for (SObjectField accountField : PERSON_ACCOUNT_FIELDS) {
                personAccountFields.put(accountField.toString(), accountRecord.get(accountField));
            }
        }
    }
}