public with sharing class PCQTSelectorTypes {
    public class PCQTItem {
        @AuraEnabled public Id id;
        @AuraEnabled public String label;
        @AuraEnabled public String apiKey;
        @AuraEnabled public Boolean addictionServices;
        @AuraEnabled public Boolean generalPsychiatry;
        @AuraEnabled public Integer order;
    }

    public class SaveResult {
        @AuraEnabled public Id authoritativeCaseId;
        @AuraEnabled public Integer insertedCount;
        @AuraEnabled public Integer deletedCount;
    }
}