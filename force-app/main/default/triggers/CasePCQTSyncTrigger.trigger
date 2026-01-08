trigger CasePCQTSyncTrigger on Case (after insert, after update) {
    if (Trigger.isAfter) {
        CasePCQTSyncService.syncFromCase(Trigger.new, Trigger.isUpdate ? Trigger.oldMap : null);
    }
}