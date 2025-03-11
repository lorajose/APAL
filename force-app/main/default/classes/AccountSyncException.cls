/**
 * @description Exception class for handling account synchronization errors.
 *
 * @author Artem Shevchenko
 * @date 03.07.2025
 */
public with sharing class AccountSyncException extends Exception {

    /**
     * @description Exception thrown when a record is disabled for synchronization.
     */
    public class RecordDisableForSyncException extends Exception {}

    /**
     * @description Exception thrown when a required record cannot be found.
     */
    public class RecordNotFoundException extends Exception { }
}