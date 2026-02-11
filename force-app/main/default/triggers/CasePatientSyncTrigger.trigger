trigger CasePatientSyncTrigger on Case (after update) {
    if (Trigger.isAfter && Trigger.isUpdate) {
        CasePatientSyncHandler.handle(Trigger.new, Trigger.oldMap);
    }
}