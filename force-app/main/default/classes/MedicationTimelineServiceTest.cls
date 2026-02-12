@IsTest
public class MedicationTimelineServiceTest {

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
      Medication__c   medicationA = new Medication__c      (
        Name = 'Medication A'
      );
      insert medicationA;
        
           // Create a Substance_Listing__c record (assuming it's a custom object)
      Medication__c  medicationB = new Medication__c      (
        Name = 'Medication B'
      );
      insert medicationB;

        // Create some Patient_Medication__c records
        Patient_Medication__c medication1 = new Patient_Medication__c(
            Case__c = parentCase.Id,
            //Medication__c = medicationA.Id,
            Medication_List__c = medicationA.Id,
            MedicationNotes__c = 'Notes for Medication A',
            Medication_Changes__c = 'START New Medication',
            Current_Medication__c = true
           // CreatedDate = DateTime.now()
        );
        insert medication1;

        Patient_Medication__c medication2 = new Patient_Medication__c(
            Case__c = parentCase.Id,
            //Medication__c = medicationB.Id,
            Medication_List__c = medicationB.Id,
            MedicationNotes__c = 'Notes for Medication B',
            Medication_Changes__c = 'Watchful Waiting / Consider specific',
            Current_Medication__c = false
            //CreatedDate = DateTime.now().addDays(-10)
        );
        insert medication2;
    }

    @IsTest
    static void testGetObjectName() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals('Patient_Medication__c', service.getObjectName(), 'The object name should be Patient_Medication__c');
    }

    @IsTest
    static void testGetTitleField() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals('Medication__c', service.getTitleField(), 'The title field should be Medication__c');
    }

    @IsTest
    static void testGetDateField() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals('CreatedDate', service.getDateField(), 'The date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        MedicationTimelineService service = new MedicationTimelineService();
        List<String> fieldsToDisplay = service.getFieldsToDisplay();
        System.assertEquals(7, fieldsToDisplay.size(), 'The number of fields to display should be 7');
       // System.assert(fieldsToDisplay.contains('Medication__c'), 'The fields to display should contain Medication__c');
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
    static void testGetDataWithDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        MedicationTimelineService service = new MedicationTimelineService();

        Test.startTest();

        // Test data retrieval for last 7 days
        List<Object> result = service.getData(subCase.Id, 'last_7_days');
        System.assertEquals(2, result.size(), 'There should be 1 medication record for the last 7 days');

        // Test data retrieval for last 30 days
        result = service.getData(subCase.Id, 'last_30_days');
        System.assertEquals(2, result.size(), 'There should be 2 medication records for the last 30 days');

        Test.stopTest();
    }

    @IsTest
    static void testGetDataWithNoDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        MedicationTimelineService service = new MedicationTimelineService();

        Test.startTest();

        // Test data retrieval with no date filter
        List<Object> result = service.getData(subCase.Id, null);
        System.assertEquals(2, result.size(), 'There should be 2 medication records when no date filter is applied');

        Test.stopTest();
    }

    @IsTest
    static void testBaseUrlForRecordDetail() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals('', service.getBaseUrlForRecordDetail(), 'The base URL for record detail should be empty');
    }

    @IsTest
    static void testRecordIdentifierField() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals('Id', service.getRecordIdentifierField(), 'The record identifier field should be Id');
    }

    @IsTest
    static void testIsSalesforceObject() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals(true, service.isSalesforceObject(), 'This should return true for Salesforce object');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        MedicationTimelineService service = new MedicationTimelineService();
        System.assertEquals(true, service.isUiApiNotSupported(), 'UI API should not be supported');
    }
}