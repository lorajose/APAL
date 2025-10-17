@isTest
public class ScheduledUnsubmittedRecordCleanupTest {
    // Method to create a reference Case record
    private static Id createCase() {
        Case testCase = new Case(Subject = 'Test Case');
        insert testCase;
        return testCase.Id;
    }
    
    private static Id createConcern() {
        Concern_List__c testConcern = new Concern_List__c(Name = 'Test Concern');
        insert testConcern;
        return testConcern.Id;
    }
    
    /*  private static Id createPatientConcern() {
        Patient_Concern__c testPatientConcern = new Patient_Concern__c(	Concern__c = , 	Case__c = );
        insert testPatientConcern;
        return testPatientConcern.Id;
    } */

    // Method to create test records
    private static List<Id> createTestRecords(String objectApiName, Integer recordCount, Boolean isCompleted, Id caseId, Id concernId) {
        List<SObject> records = new List<SObject>();
        for (Integer i = 0; i < recordCount; i++) {
            SObject record = (SObject)Type.forName(objectApiName).newInstance();
            record.put('Submission_Completed__c', isCompleted);
            record.put('Case__c', caseId); // Set Case reference
            
            // Set required fields based on object type
            if (objectApiName == 'Patient_Concern__c') {
                record.put('Concern__c', concernId);  
            } else if (objectApiName == 'Patient_Safety_Risk__c') {
               // record.put('Safety_Risk__c', 'a0PBZ00000156Q62AI');  
            } else if (objectApiName == 'Patient_Screener__c') {
               // record.put('Screener__c', 'a0QBZ000003GYgM2AW');  
            } else if (objectApiName == 'Patient_Substance__c') {
               // record.put('Substance_Listing__c', 'a0SBZ000001SQpl2AG');  
            }
            records.add(record);
        }
        try {
            insert records;
        } catch (DmlException e) {
            System.debug('DML Exception: ' + e.getMessage());
            throw e;
        }

        System.debug('Created ' + records.size() + ' records for ' + objectApiName);

        List<Id> recordIds = new List<Id>();
        for (SObject record : records) {
            recordIds.add(record.Id);
        }

        return recordIds;
    }

    @isTest
    static void testUnsubmittedRecordCleanup() {
        // Create a reference Case record
        Id caseId = createCase();
        Id concernId = createConcern();

        // List of object API names
        List<String> objectApiNames = new List<String>{
            'Patient_Concern__c'
        };

        // Create test records and set created dates before Test.startTest()
        for (String objectApiName : objectApiNames) {
            List<Id> olderUnsubmittedRecordIds = createTestRecords(objectApiName, 4, false, caseId, concernId); // Unsubmitted records
            List<Id> submittedRecordIds = createTestRecords(objectApiName, 4, true, caseId, concernId);  // Submitted records
            List<Id> recentUnsubmittedRecordIds = createTestRecords(objectApiName, 4, false, caseId, concernId);  // Recent unsubmitted records

            // Set created dates for older records
            for (Id recordId : olderUnsubmittedRecordIds) {
                Test.setCreatedDate(recordId, Datetime.now().addMinutes(-20));
            }
            for (Id recordId : submittedRecordIds) {
                Test.setCreatedDate(recordId, Datetime.now().addMinutes(-20));
            }
            for (Id recordId : recentUnsubmittedRecordIds) {
                Test.setCreatedDate(recordId, Datetime.now().addMinutes(-5));
            }
        }

        // Run the cleanup
        Test.startTest();
        ScheduledUnsubmittedRecordCleanup scheduledJob = new ScheduledUnsubmittedRecordCleanup();
        String jobId = System.schedule('Test Scheduled Cleanup', '0 0 * * * ?', scheduledJob);
        Test.stopTest();

        // Validate the cleanup
        for (String objectApiName : objectApiNames) {
            // Query all records
            String query = 'SELECT Id, Submission_Completed__c, CreatedDate FROM ' + objectApiName;
            List<SObject> allRecords = Database.query(query);
            System.debug('Total records for ' + objectApiName + ': ' + allRecords.size());
            System.assertEquals(8, allRecords.size(), 'Total records should be 8');

            // Validate unsubmitted records created 20 minutes ago are deleted
            Datetime tenMinutesAgo = Datetime.now().addMinutes(-10);
            String queryDeleted = 'SELECT Id FROM ' + objectApiName + ' WHERE Submission_Completed__c = FALSE AND CreatedDate < ' + tenMinutesAgo.format('yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
            List<SObject> deletedRecords = Database.query(queryDeleted);
            System.debug('Deleted records for ' + objectApiName + ': ' + deletedRecords.size());
            System.assertEquals(0, deletedRecords.size(), 'Unsubmitted records created more than 10 minutes ago should be deleted');

            // Validate submitted records are not deleted
            String querySubmitted = 'SELECT Id FROM ' + objectApiName + ' WHERE Submission_Completed__c = TRUE';
            List<SObject> submittedRecords = Database.query(querySubmitted);
            System.debug('Submitted records for ' + objectApiName + ': ' + submittedRecords.size());
            System.assertEquals(4, submittedRecords.size(), 'Submitted records should not be deleted');

            // Validate unsubmitted records created within the last 10 minutes are not deleted
            String queryRecent = 'SELECT Id FROM ' + objectApiName + ' WHERE Submission_Completed__c = FALSE AND CreatedDate >= ' + tenMinutesAgo.format('yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
            List<SObject> recentUnsubmittedRecords = Database.query(queryRecent);
            System.debug('Recent unsubmitted records for ' + objectApiName + ': ' + recentUnsubmittedRecords.size());
            System.assertEquals(4, recentUnsubmittedRecords.size(), 'Unsubmitted records created within the last 10 minutes should not be deleted');
        }
    }
}