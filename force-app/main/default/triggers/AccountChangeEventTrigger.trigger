/**
 * @author Artem Shevchenko
 * @date 02.24.2025
 *
 * @description Handles Account Change Data Capture (CDC) events and passes them to the trigger handler.
 */
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        new AccountChangeEventTriggerHandler().handleAfterInsert(
                (List<AccountChangeEvent>) Trigger.new
        );
    }
}