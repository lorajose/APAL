@IsTest
public class ScreenerTimelineServiceTest {

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
      Screener__c    substanceListingA = new Screener__c   (
        Name = 'Screener A'
      );
      insert substanceListingA;
        
           // Create a Substance_Listing__c record (assuming it's a custom object)
      Screener__c  substanceListingB = new Screener__c   (
        Name = 'Screener B'
      );
      insert substanceListingB;

        // Create some Patient_Screener__c records
        Patient_Screener__c screener1 = new Patient_Screener__c(
            Case__c = parentCase.Id,
           // Screener_Name__c = 'Screener One',
            Screener__c = substanceListingA.Id,
            Notes_new__c = 'This is a note for Screener One',
            Positive_Outcome__c = true,
            Aproximate_Date_Screened__c = Date.today()
           // CreatedDate = DateTime.now()
        );
        insert screener1;

        Patient_Screener__c screener2 = new Patient_Screener__c(
            Case__c = parentCase.Id,
           // Screener_Name__c = 'Screener Two',
            Screener__c = substanceListingB.Id,
            Notes_new__c = 'This is a note for Screener Two',
            Positive_Outcome__c = false,
            Aproximate_Date_Screened__c = Date.today().addDays(-10)
           // CreatedDate = DateTime.now().addDays(-10)
        );
        insert screener2;
    }

    @IsTest
    static void testGetObjectName() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals('Patient_Screener__c', service.getObjectName(), 'The object name should be Patient_Screener__c');
    }

    @IsTest
    static void testGetTitleField() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals('Screener_Name__c', service.getTitleField(), 'The title field should be Screener_Name__c');
    }

    @IsTest
    static void testGetDateField() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals('Aproximate_Date_Screened__c', service.getDateField(), 'The date field should be Aproximate_Date_Screened__c');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        List<String> fieldsToDisplay = service.getFieldsToDisplay();
        System.assertEquals(7, fieldsToDisplay.size(), 'The number of fields to display should be 7');
    }

    @IsTest
    static void testGetDataWithDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        ScreenerTimelineService service = new ScreenerTimelineService();

        Test.startTest();

        // Test data retrieval for last 7 days
        List<Object> result = service.getData(subCase.Id, 'last_7_days');
        System.assertEquals(2, result.size(), 'There should be 1 screener for the last 7 days');

        // Test data retrieval for last 30 days
        result = service.getData(subCase.Id, 'last_30_days');
        System.assertEquals(2, result.size(), 'There should be 2 screeners for the last 30 days');

        Test.stopTest();
    }

    @IsTest
    static void testGetDataWithNoDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        ScreenerTimelineService service = new ScreenerTimelineService();

        Test.startTest();

        // Test data retrieval with no date filter
        List<Object> result = service.getData(subCase.Id, null);
        System.assertEquals(2, result.size(), 'There should be 2 screeners when no date filter is applied');

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
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals('', service.getBaseUrlForRecordDetail(), 'The base URL for record detail should be empty');
    }

    @IsTest
    static void testRecordIdentifierField() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals('Id', service.getRecordIdentifierField(), 'The record identifier field should be Id');
    }

    @IsTest
    static void testIsSalesforceObject() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals(true, service.isSalesforceObject(), 'This should return true for Salesforce object');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        ScreenerTimelineService service = new ScreenerTimelineService();
        System.assertEquals(true, service.isUiApiNotSupported(), 'UI API should not be supported');
    }
}