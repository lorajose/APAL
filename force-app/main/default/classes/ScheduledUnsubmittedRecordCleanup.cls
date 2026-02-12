public class ScheduledUnsubmittedRecordCleanup implements Schedulable{
    public void execute(SchedulableContext sc) {
        // List of object API names to be cleaned up
        List<String> objectApiNames = new List<String>{
            'Patient_Concern__c',
            'Patient_Safety_Risk__c',
            'Patient_Screener__c',
            'Patient_Support__c',
            'Patient_Substance__c',
            'Patient_Medication__c'    
        };
        
        UnsubmittedRecordCleanup.executeCleanup(objectApiNames);
    }

}