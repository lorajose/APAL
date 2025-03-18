/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * @description Selector class for querying Account records based on different WHERE clauses.
 */
public without sharing class AccountSelector {

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
}