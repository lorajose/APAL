/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * @description Selector class for querying Account records based on different WHERE clauses.
 */
public without sharing class AccountSelector {

    /**
     * @description Retrieves all Account records with PersonAccount record type.
     * @return A list of Account records with PersonAccount record type.
    */
    public List<Account> queryAllPersonAccounts() {
        List<Account> accountRecords = new List<Account>();

        accountRecords = [
                SELECT
                        Id
                        , FirstName
                        , LastName
                        , PersonEmail
                        , Phone
                        , pcpnpi__c
                        , AccountSync_Id__c
                FROM Account
                WHERE RecordType.DeveloperName = :AccountSyncUtil.PERSON_ACCOUNT_RECORD_TYPE_DEVELOPER_NAME
        ];

        return accountRecords;
    }

    /**
     * @description Retrieves Account records by their IDs.
     * @param accountIds The set of Account IDs to query.
     * @return A list of Account records containing Id and AccountSync_Id__c.
     */
    public List<Account> queryByIds(Set<Id> accountIds) {
        List<Account> accountRecords = new List<Account>();

        if (accountIds.isEmpty()) {
            return accountRecords;
        }

        accountRecords = (List<Account>) Database.query(
                this.buildDynamicQuery(
                        accountIds
                )
        );

        return accountRecords;
    }

    public Account queryByAccountSyncId(String accountSyncId) {
        if (String.isBlank(accountSyncId)) {
            return null;
        }

        Set<String> accountSyncIds = new Set<String>{
                accountSyncId
        };

        List<Account> accountRecords = (List<Account>) Database.query(
                this.buildDynamicQuery(
                        accountSyncIds
                )
        );

        return accountRecords.isEmpty() ? null : accountRecords[0];
    }

    private String buildDynamicQuery(Set<Id> accountIds) {
        Map<String, Schema.SObjectField> fields = Account.SObjectType.getDescribe().fields.getMap();
        List<String> fieldNames = new List<String>(fields.keySet());

        return 'SELECT RecordType.DeveloperName, ' + String.join(fieldNames, ',') + ' FROM Account WHERE Id IN :accountIds AND AccountSync_Id__c != NULL';
    }

    private String buildDynamicQuery(Set<String> accountSyncIds) {
        Map<String, Schema.SObjectField> fields = Account.SObjectType.getDescribe().fields.getMap();
        List<String> fieldNames = new List<String>(fields.keySet());

        return 'SELECT RecordType.DeveloperName, ' + String.join(fieldNames, ',') + ' FROM Account WHERE AccountSync_Id__c IN :accountSyncIds';
    }

    public String buildDynamicExternalQuery(Set<String> fieldNames) {
        Set<String> allFields = new Set<String>(fieldNames);
        allFields.add('Id');
        allFields.add('AccountSync_Id__c');
        return 'SELECT ' + String.join(new List<String>(allFields), ',') +
           ' FROM Account WHERE RecordType.DeveloperName = \'PersonAccount\'';
        //return 'SELECT AccountSync_Id__c, ' + String.join(new List<String>(fieldNames), ',') + ' FROM Account WHERE RecordType.DeveloperName = \'PersonAccount\'';
    }
}