@IsTest
public class PatientConcernTimelineServiceTest {

    @TestSetup
    static void setupTestData() {
        // Create a parent case
        Case parentCase = new Case(
            Subject = 'Test Parent Case',
            Status = 'Open'
        );
        insert parentCase;

        // Create a subcase
        Case subCase = new Case(
            Subject = 'Test Sub Case',
            Status = 'Open',
            ParentId = parentCase.Id
        );
        insert subCase;
        
                   // Create a Substance_Listing__c record (assuming it's a custom object)
      Concern_List__c  concernA = new Concern_List__c     (
        Name = 'Concern A'
      );
      insert concernA;
        
           // Create a Substance_Listing__c record (assuming it's a custom object)
      Concern_List__c   concernB = new Concern_List__c     (
        Name = 'Concern B'
      );
      insert concernB;

        // Create some Patient_Concern__c records
        Patient_Concern__c concern1 = new Patient_Concern__c(
            Case__c = parentCase.Id,
            //ConcernName__c = 'Concern One',
            Concern__c = concernA.Id,
            Notes_new__c = 'This is a note for Concern One'
           // CreatedDate = DateTime.now()
        );
        insert concern1;

        Patient_Concern__c concern2 = new Patient_Concern__c(
            Case__c = parentCase.Id,
            //ConcernName__c = 'Concern Two',
            Concern__c = concernB.Id,
            Notes_new__c = 'This is a note for Concern Two'
           // CreatedDate = DateTime.now().addDays(-10)
        );
        insert concern2;
    }

    @IsTest
    static void testGetObjectName() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals('Patient_Concern__c', service.getObjectName(), 'The object name should be Patient_Concern__c');
    }

    @IsTest
    static void testGetTitleField() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals('ConcernName__c', service.getTitleField(), 'The title field should be ConcernName__c');
    }

    @IsTest
    static void testGetDateField() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals('CreatedDate', service.getDateField(), 'The date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        List<String> fieldsToDisplay = service.getFieldsToDisplay();
        System.assertEquals(5, fieldsToDisplay.size(), 'The number of fields to display should be 5');
        System.assert(fieldsToDisplay.contains('Concern__c'), 'The fields to display should contain Concern__c');
    }

    @IsTest
    static void testGetDataWithDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        PatientConcernTimelineService service = new PatientConcernTimelineService();

        Test.startTest();

        // Test data retrieval for last 7 days
        List<Object> result = service.getData(subCase.Id, 'last_7_days');
        System.assertEquals(2, result.size(), 'There should be 1 concern for the last 7 days');

        // Test data retrieval for last 30 days
        result = service.getData(subCase.Id, 'last_30_days');
        System.assertEquals(2, result.size(), 'There should be 2 concerns for the last 30 days');

        Test.stopTest();
    }

    @IsTest
    static void testGetDataWithNoDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        PatientConcernTimelineService service = new PatientConcernTimelineService();

        Test.startTest();

        // Test data retrieval with no date filter
        List<Object> result = service.getData(subCase.Id, null);
        System.assertEquals(2, result.size(), 'There should be 2 concerns when no date filter is applied');

        Test.stopTest();
    }

     @IsTest
    static void testGetFieldsToDisplayWithTypes() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();

        // Call getFieldsToDisplayWithTypes
        List<timeline.TimelineFieldType> fieldTypes = service.getFieldsToDisplayWithTypes();

       // Verify the content of fieldTypes
       System.assertNotEquals(null, fieldTypes, 'Field types should not be null');
       System.assertEquals(5, fieldTypes.size(), 'Field types should contain 5 elements');
    }

    @IsTest
    static void testBaseUrlForRecordDetail() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals('', service.getBaseUrlForRecordDetail(), 'The base URL for record detail should be empty');
    }

    @IsTest
    static void testRecordIdentifierField() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals('Id', service.getRecordIdentifierField(), 'The record identifier field should be Id');
    }

    @IsTest
    static void testIsSalesforceObject() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals(true, service.isSalesforceObject(), 'This should return true for Salesforce object');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        PatientConcernTimelineService service = new PatientConcernTimelineService();
        System.assertEquals(true, service.isUiApiNotSupported(), 'UI API should not be supported');
    }
}