trigger CasePracticePatientTrigger on Case (after insert, after update, after delete, after undelete) {
    if (Trigger.isAfter) {
        CasePracticePatientHandler.handle(
            Trigger.new,
            Trigger.oldMap,
            Trigger.isInsert,
            Trigger.isUpdate,
            Trigger.isDelete,
            Trigger.isUndelete
        );
    }
}