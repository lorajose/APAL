@IsTest
public class SubstanceTimelineServiceTest {

    @IsTest
    static void testGetObjectName() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify the object name is correct
        String objectName = service.getObjectName();
        System.assertEquals('Patient_Substance__c', objectName, 'Object name should be Patient_Substance__c');
    }

    @IsTest
    static void testGetRelationshipName() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify the relationship name is correct
        String relationshipName = service.getRelationshipName();
        System.assertEquals('Substances__r', relationshipName, 'Relationship name should be Substances__r');
    }

    @IsTest
    static void testGetTitleField() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify the title field is correct
        String titleField = service.getTitleField();
        System.assertEquals('Substance__c', titleField, 'Title field should be Substance__c');
    }

    @IsTest
    static void testGetDateField() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify the date field is correct
        String dateField = service.getDateField();
        System.assertEquals('CreatedDate', dateField, 'Date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify the fields to display are correct
        List<String> fields = service.getFieldsToDisplay();
        System.assertEquals(6, fields.size(), 'Fields to display should have 6 elements');
        System.assert(fields.contains('Name'), 'Fields should contain Name');
        System.assert(fields.contains('Substance__c'), 'Fields should contain Substance__c');
        System.assert(fields.contains('Substance_Listing__c'), 'Fields should contain Substance_Listing__c');
        System.assert(fields.contains('Notes__c'), 'Fields should contain Notes__c');
        System.assert(fields.contains('Frequency_of_Substance_Use__c'), 'Fields should contain Frequency_of_Substance_Use__c');
        System.assert(fields.contains('CreatedDate'), 'Fields should contain CreatedDate');
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
    static void testGetData() {
        // Prepare test data
        Case parentCase = new Case(
            Subject = 'Test Case',
            Status = 'Open'
        );
        insert parentCase;

        Case subCase = new Case(
            Subject = 'Test Sub Case',
            Status = 'Open',
            ParentId = parentCase.Id
        );
        insert subCase;
        
         // Create a Substance_Listing__c record (assuming it's a custom object)
      Substance_List__c   substanceListing = new Substance_List__c  (
        Name = 'Test Substance'
      );
      insert substanceListing;

        Patient_Substance__c patientSubstance = new Patient_Substance__c(
            Case__c = parentCase.Id,
           // Substance__c = 'Test Substance',
            Substance_Listing__c = substanceListing.Id, 
            Notes__c = 'Test Notes',
            Frequency_of_Substance_Use__c = 'Daily'
        );
        insert patientSubstance;

        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        Test.startTest();

        // Call getData method
        List<Object> result = service.getData(subCase.Id, 'last_30_days');
        Test.stopTest();

        // Verify the result contains data
        System.assertEquals(1, result.size(), 'There should be 1 result');
        Map<String, Object> record = (Map<String, Object>)result[0];
        System.assertEquals(patientSubstance.Id, record.get('Id'), 'The substance ID should match');
        System.assertEquals('Test Substance', record.get('Substance__c'), 'The substance should match');
    }

    @IsTest
    static void testIsSalesforceObject() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify that it's a Salesforce object
        Boolean isSFObject = service.isSalesforceObject();
        System.assertEquals(true, isSFObject, 'The object should be a Salesforce object');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        // Instantiate the service
        SubstanceTimelineService service = new SubstanceTimelineService();

        // Verify that the UI API is not supported
        Boolean isUiApiNotSupported = service.isUiApiNotSupported();
        System.assertEquals(true, isUiApiNotSupported, 'UI API should not be supported');
    }
}