trigger CasePCQTJunctionSyncTrigger on Case_PCQT__c (after insert, after update, after delete, after undelete) {
    Set<Id> caseIds = new Set<Id>();
    if (Trigger.isInsert || Trigger.isUpdate || Trigger.isUndelete) {
        for (Case_PCQT__c row : Trigger.new) {
            if (row.Case__c != null) caseIds.add(row.Case__c);
        }
    }
    if (Trigger.isDelete) {
        for (Case_PCQT__c row : Trigger.old) {
            if (row.Case__c != null) caseIds.add(row.Case__c);
        }
    }
    if (!caseIds.isEmpty()) {
        CasePCQTSyncService.syncFromJunction(caseIds);
    }
}