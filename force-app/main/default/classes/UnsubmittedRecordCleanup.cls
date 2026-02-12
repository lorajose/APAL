public class UnsubmittedRecordCleanup {

    public static void executeCleanup(List<String> objectApiNames) {
        Datetime now = Datetime.now();
        Datetime tenMinutesAgo = now.addMinutes(-10);

        for (String objectApiName : objectApiNames) {
            String query = 'SELECT Id FROM ' + objectApiName + 
                           ' WHERE Submission_Completed__c = FALSE AND CreatedDate < :tenMinutesAgo';

            List<SObject> unsubmittedRecords = Database.query(query);
            if (!unsubmittedRecords.isEmpty()) {
                delete unsubmittedRecords;
            }
        }
    }
}