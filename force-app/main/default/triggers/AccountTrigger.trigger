/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * Handles Account records and passes them to the trigger handler.
 */
trigger AccountTrigger on Account (before insert, after insert) {
    if (Trigger.isBefore && Trigger.isInsert) {
        new AccountTriggerHandler().handleBeforeInsert(
                (List<Account>) Trigger.new
        );
    }
    if (Trigger.isAfter && Trigger.isInsert) {
        new AccountTriggerHandler().handleAfterInsert(
                (List<Account>) Trigger.new
        );
    }
}