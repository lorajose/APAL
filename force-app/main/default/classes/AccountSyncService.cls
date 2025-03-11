/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * @description Service class responsible for initiating the batch process to synchronize
 * Account Change Data Capture (CDC) events with an external system.
 */
public with sharing class AccountSyncService {

    private static AccountSelector accountSelector = new AccountSelector();
    private static AccountSyncLogger syncLogger = AccountSyncLogger.getInstance();
    private static AccountSyncFieldMappingSelector fieldMappingSelector = new AccountSyncFieldMappingSelector();

    private Map<String, String> fieldMappingsMap;
    private Map<String, String> fieldDefaultValueMappingsMap;
    private Map<String, DescribeFieldResult> accountFieldDescribeByApiName;
    private Map<String, Account> accountsByChangeEventIds;

    /**
     * @description Executes the Account synchronization process by running a batch job.
     * @param accountChangeEvents The list of AccountChangeEvent records to process.
     */
    public void executeAccountSync(List<AccountChangeEvent> accountChangeEvents) {
        Map<String, Account> accountsByChangeEventIds = this.getAccountsByChangeEventIds(
                accountChangeEvents
        );

        Database.executeBatch(
                new AccountSyncBatch(accountChangeEvents, accountsByChangeEventIds),
                AccountSyncUtil.BATCH_CHUNK_SIZE
        );
    }

    /**
     * @description Handles the synchronization of an Account based on the provided request.
     * Validates the request and processes it by either creating or updating the Account.
     * @param syncRequest The request containing Account synchronization data.
     */
    public void handleAccountSync(AccountSyncUtil.RequestWrapper syncRequest) {
        this.validateSyncRequest(syncRequest);
        this.retrieveFieldMappings();
        this.processSyncRequest(syncRequest);
    }

    /**
     * @description Generates and assigns a unique Account Sync ID for the given records.
     * @param accountRecords The list of Account records that require a Sync ID.
     */
    public void setAccountSyncId(List<Account> accountRecords) {
        if (accountRecords.isEmpty()) {
            return;
        }

        for (Account accountRecord : accountRecords) {
            if (String.isBlank(accountRecord.AccountSync_Id__c)) {
                accountRecord.AccountSync_Id__c = AccountSyncUtil.generateAccountSyncId();
            }
        }
    }

    /**
     * @description Determines whether an Account Change Data Capture (CDC) event should be bypassed
     * to prevent unnecessary synchronization.
     *
     * The sync is bypassed in the following cases:
     * - If the event is a CREATE event and the AccountSync_Id__c is either blank
     *   or belongs to APAL (indicating it originated from the target org).
     * - If the event is an UPDATE event and the only field changed is the sync bypass field.
     *
     * @param accountChangeEvent The AccountChangeEvent record to evaluate.
     * @return True if the sync should be bypassed, otherwise false.
     */
    public Boolean shouldBypassSync(AccountChangeEvent accountChangeEvent) {
        return (AccountSyncUtil.isCreateChangeType(accountChangeEvent) && this.shouldBypassCreateSync(accountChangeEvent))
                || (AccountSyncUtil.isUpdateChangeType(accountChangeEvent)) && this.shouldBypassUpdateSync(accountChangeEvent);
    }

    private Boolean shouldBypassCreateSync(AccountChangeEvent accountChangeEvent) {
        return String.isBlank(accountChangeEvent.AccountSync_Id__c)
                || accountChangeEvent.AccountSync_Id__c.startsWith(AccountSyncUtil.VMAP_PREFIX);
    }

    private Boolean shouldBypassUpdateSync(AccountChangeEvent accountChangeEvent) {
        if (accountChangeEvent.AccountSync_Bypass__c) {
            update new Account(
                    Id = accountChangeEvent.ChangeEventHeader.getRecordIds()[0],
                    AccountSync_Bypass__c = false
            );
        }

        return accountChangeEvent.AccountSync_Bypass__c || this.isOnlySyncBypassFieldChanged(
                accountChangeEvent.ChangeEventHeader.getChangedFields()
        );
    }

    /**
     * @description Retrieves a mapping of AccountChangeEvent IDs to their corresponding Account records.
     * @param accountChangeEvents The list of AccountChangeEvent records.
     * @return A map where the key is the AccountChangeEvent ID and the value is the Account record.
     */
    public Map<String, Account> getAccountsByChangeEventIds(List<AccountChangeEvent> accountChangeEvents) {

        if (accountsByChangeEventIds == null) {
            accountsByChangeEventIds = new Map<String, Account>();
            Map<Id, Id> accountIdsByChangeEventIds = this.getAccountIdsByChangeEventIds(
                    accountChangeEvents
            );

            List<Account> accountRecords = accountSelector.queryByIds(
                    new Set<Id>(accountIdsByChangeEventIds.values())
            );

            Map<Id, Account> accountsByIds = getAccountsByIds(accountRecords);

            for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
                Account accountRecord = accountsByIds.get(
                        accountIdsByChangeEventIds.get(accountChangeEvent.Id)
                );
                if (String.isNotBlank(accountRecord.AccountSync_Id__c)) {
                    accountsByChangeEventIds.put(
                            accountChangeEvent.Id,
                            accountRecord
                    );
                }
            }
        }

        return this.accountsByChangeEventIds;
    }

    /**
     * @description Converts a list of Account records into a map where the key is the Account ID.
     * @param accountRecords The list of Account records.
     * @return A map of Account IDs to their corresponding Account records.
     */
    private static Map<Id, Account> getAccountsByIds(List<Account> accountRecords) {
        Map<Id, Account> accountsByIds = new Map<Id, Account>();
        for (Account accountRecord : accountRecords) {
            accountsByIds.put(accountRecord.Id, accountRecord);
        }
        return accountsByIds;
    }

    /**
     * @description Retrieves a mapping of AccountChangeEvent IDs to their associated Account IDs.
     * @param accountChangeEvents The list of AccountChangeEvent records.
     * @return A map where the key is the AccountChangeEvent ID and the value is the related Account ID.
     */
    public Map<Id, Id> getAccountIdsByChangeEventIds(List<AccountChangeEvent> accountChangeEvents) {
        Map<Id, Id> accountIdsByChangeEventIds = new Map<Id, Id>();
        for (AccountChangeEvent accountChangeEvent : accountChangeEvents) {
            List<String> recordIds = accountChangeEvent.ChangeEventHeader.getRecordIds();

            if (!recordIds.isEmpty()) {
                accountIdsByChangeEventIds.put(accountChangeEvent.Id, Id.valueOf(recordIds[0]));
            }
        }

        return accountIdsByChangeEventIds;
    }

    private Boolean isOnlySyncBypassFieldChanged(List<String> changedFields) {
        return (changedFields.size() == 2
                && changedFields.contains(AccountSyncUtil.SYNC_BYPASS_FIELD_API_NAME)
                && changedFields.contains(AccountSyncUtil.LAST_MODIFIED_DATE_FIELD_API_NAME)) ||
                (changedFields.size() == 3
                        && changedFields.contains(AccountSyncUtil.SYNC_BYPASS_FIELD_API_NAME)
                        && changedFields.contains(AccountSyncUtil.LAST_MODIFIED_BY_ID_FIELD_API_NAME)
                        && changedFields.contains(AccountSyncUtil.LAST_MODIFIED_DATE_FIELD_API_NAME));
    }

    private void retrieveFieldMappings() {
        this.fieldMappingsMap = new Map<String, String>();
        this.fieldDefaultValueMappingsMap = new Map<String, String>();
        for (AccountSync_Field_Mapping__mdt fieldMapping : fieldMappingSelector.queryAllActive()) {
            if (String.isNotBlank(fieldMapping.APAL_Field_API_Name__c)) {
                this.fieldMappingsMap.put(
                        fieldMapping.VMAP_Field_API_Name__c,
                        fieldMapping.APAL_Field_API_Name__c

                );
            } else {
                this.fieldDefaultValueMappingsMap.put(
                        fieldMapping.APAL_Field_API_Name__c,
                        fieldMapping.Default_Value__c
                );
            }
        }
    }

    private void validateSyncRequest(AccountSyncUtil.RequestWrapper syncRequest) {

    }

    private void processSyncRequest(AccountSyncUtil.RequestWrapper syncRequest) {
        Account accountRecord = accountSelector.queryByAccountSyncId(
                syncRequest.accountSyncId
        );

        if (syncRequest.changeType == AccountSyncUtil.CDC_EVENT_TYPE_UPDATE && accountRecord == null) {
            throw new AccountSyncException.RecordNotFoundException(AccountSyncUtil.EXCEPTION_MESSAGE_RECORD_NOT_FOUND);
        } else if (accountRecord != null && accountRecord.Disable_AccountSync__c) {
            throw new AccountSyncException.RecordDisableForSyncException(AccountSyncUtil.EXCEPTION_MESSAGE_RECORD_DISABLED);
        }

        Id accountIdToLog;

        if (accountRecord == null) {
            accountIdToLog = this.createAccount(syncRequest);
        } else {
            this.updateAccount(accountRecord, syncRequest);
            accountIdToLog = accountRecord.Id;
        }

        this.logSuccessfulSync(syncRequest, accountIdToLog);
    }

    private Id createAccount(AccountSyncUtil.RequestWrapper syncRequest) {
        Account newAccount = new Account(
                AccountSync_Id__c = syncRequest.accountSyncId
        );

        for (String externalFieldApiName : this.fieldMappingsMap.keySet()) {
            this.populateAccountField(
                    newAccount,
                    fieldMappingsMap.get(externalFieldApiName),
                    syncRequest.changeEvent.get(externalFieldApiName)
            );
        }

        for (String internalFieldApiName : this.fieldDefaultValueMappingsMap.keySet()) {
            this.populateAccountField(
                    newAccount,
                    internalFieldApiName,
                    fieldDefaultValueMappingsMap.get(internalFieldApiName)
            );
        }

        Database.insert(newAccount);
        return newAccount.Id;
    }

    private void updateAccount(Account accountRecord, AccountSyncUtil.RequestWrapper syncRequest) {
        accountRecord.AccountSync_Bypass__c = true;

        for (String changedExternalField : normalizeNameSubFields(syncRequest.changedFields)) {
            if (this.fieldMappingsMap.containsKey(changedExternalField)) {
                this.populateAccountField(
                        accountRecord,
                        this.fieldMappingsMap.get(changedExternalField),
                        syncRequest.changeEvent.get(changedExternalField)
                );
            }
        }

        for (String personAccountField : syncRequest.personAccountFields.keySet()) {
            if (this.fieldMappingsMap.containsKey(personAccountField)) {
                if (accountRecord.get(personAccountField) != syncRequest.personAccountFields.get(personAccountField)) {
                    this.populateAccountField(
                            accountRecord,
                            this.fieldMappingsMap.get(personAccountField),
                            syncRequest.personAccountFields.get(personAccountField)
                    );
                }
            }
        }

        upsert accountRecord Account.AccountSync_Id__c;
    }

    private static List<String> normalizeNameSubFields(List<String> changedFields) {
        List<String> updatedFields = new List<String>();

        for (String field : changedFields) {
            if (field.contains(AccountSyncUtil.NAME_SUBFIELD_PREFIX)) {
                updatedFields.add(field.split('\\.')[1]);
            } else if (field == AccountSyncUtil.NAME_FIELD_API_NAME) {
                updatedFields.addAll(AccountSyncUtil.NAME_SUBFIELDS_API_NAMES);
            } else {
                updatedFields.add(field);
            }
        }

        return updatedFields;
    }

    private void populateAccountField(Account accountRecord, String fieldApiName, Object fieldValue) {
        Map<String, DescribeFieldResult> fieldDescribeByApiName = this.getAccountFieldDescribeByApiName();

        Object parsedValue;

        switch on fieldDescribeByApiName.get(fieldApiName.toLowerCase()).getType() {
            when BOOLEAN {
                parsedValue = Boolean.valueOf(fieldValue);
            }
            when DATE {
                parsedValue = fieldValue != null ? Date.valueOf(String.valueOf(fieldValue)) : fieldValue;
            }
            when else {
                parsedValue = fieldValue;
            }
        }

        accountRecord.put(fieldApiName, parsedValue);
    }

    public Map<String, DescribeFieldResult> getAccountFieldDescribeByApiName() {
        if (this.accountFieldDescribeByApiName == null) {
            accountFieldDescribeByApiName = new Map<String, DescribeFieldResult>();
            Map<String, Schema.SObjectField> fieldMap = Schema.Account.SObjectType.getDescribe().fields.getMap();
            for (String fieldName : fieldMap.keySet()) {
                accountFieldDescribeByApiName.put(fieldName, fieldMap.get(fieldName).getDescribe());
            }
        }

        return accountFieldDescribeByApiName;
    }

    private void logSuccessfulSync(AccountSyncUtil.RequestWrapper syncRequest, Id accountId) {
        syncLogger.commitLog(syncLogger.createCompleteLog()
                .setSyncId(syncRequest.accountSyncId)
                .setRecordId(accountId)
                .setType(syncRequest.changeType)
                .setInitiator(syncRequest.syncInitiatorName)
                .setDirection(AccountSyncUtil.APAL_PREFIX)
                .setPayload(syncRequest)
        );
    }
}