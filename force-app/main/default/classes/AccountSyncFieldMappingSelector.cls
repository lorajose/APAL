/**
 * @author Artem Shevchenko
 * @date 02.26.2025
 *
 * @description Selector class for querying AccountSync_Field_Mapping__mdt records.
 */
public with sharing class AccountSyncFieldMappingSelector {

    /**
     * @description Retrieves all active field mapping records.
     * @return A list of active AccountSync_Field_Mapping__mdt metadata records.
    */
    public List<AccountSync_Field_Mapping__mdt> queryAllActive() {
        return [
                SELECT
                        Id
                        , APAL_Field_API_Name__c
                        , VMAP_Field_API_Name__c
                        , Default_Value__c
                FROM AccountSync_Field_Mapping__mdt
                WHERE Is_Active__c = TRUE
        ];
    }
}