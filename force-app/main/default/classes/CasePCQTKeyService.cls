public with sharing class CasePCQTKeyService {
    /**
     * Populate Case_PCQT_Key__c as a unique key: CaseId-PCQTId.
     */
    public static void populateKeys(List<Case_PCQT__c> records) {
        if (records == null) return;
        for (Case_PCQT__c r : records) {
            if (r.Case__c == null || r.PCQT__c == null) continue;
            if (String.isBlank(r.Case_PCQT_Key__c)) {
                r.Case_PCQT_Key__c = String.valueOf(r.Case__c) + '-' + String.valueOf(r.PCQT__c);
            }
        }
    }
}