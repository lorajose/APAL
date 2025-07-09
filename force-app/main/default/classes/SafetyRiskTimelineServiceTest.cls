@IsTest
public class SafetyRiskTimelineServiceTest {

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
      Safety_Risk__c    riskA = new Safety_Risk__c    (
        Name = 'Risk A'
      );
      insert riskA;
        
           // Create a Substance_Listing__c record (assuming it's a custom object)
      Safety_Risk__c   riskB = new Safety_Risk__c    (
        Name = 'Risk B'
      );
      insert riskB;

        // Create some Patient_Safety_Risk__c records
        Patient_Safety_Risk__c safetyRisk1 = new Patient_Safety_Risk__c(
            Case__c = parentCase.Id,
            //Safety_RiskName__c = 'Safety Risk One',
            Safety_Risk__c = riskA.Id,
            Notes_new__c = 'This is a note for Safety Risk One',
            Historical__c = true,
            Recent__c = false
           // CreatedDate = DateTime.now()
        );
        insert safetyRisk1;

        Patient_Safety_Risk__c safetyRisk2 = new Patient_Safety_Risk__c(
            Case__c = parentCase.Id,
           // Safety_RiskName__c = 'Safety Risk Two',
            Safety_Risk__c = riskB.Id,
            Notes_new__c = 'This is a note for Safety Risk Two',
            Historical__c = false,
            Recent__c = true
            //CreatedDate = DateTime.now().addDays(-10)
        );
        insert safetyRisk2;
    }

    @IsTest
    static void testGetObjectName() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals('Patient_Safety_Risk__c', service.getObjectName(), 'The object name should be Patient_Safety_Risk__c');
    }

    @IsTest
    static void testGetTitleField() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals('Safety_RiskName__c', service.getTitleField(), 'The title field should be Safety_RiskName__c');
    }

    @IsTest
    static void testGetDateField() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals('CreatedDate', service.getDateField(), 'The date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        List<String> fieldsToDisplay = service.getFieldsToDisplay();
        System.assertEquals(7, fieldsToDisplay.size(), 'The number of fields to display should be 7');
    }

    @IsTest
    static void testGetDataWithDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        SafetyRiskTimelineService service = new SafetyRiskTimelineService();

        Test.startTest();

        // Test data retrieval for last 7 days
        List<Object> result = service.getData(subCase.Id, 'last_7_days');
        System.assertEquals(2, result.size(), 'There should be 1 safety risk for the last 7 days');

        // Test data retrieval for last 30 days
        result = service.getData(subCase.Id, 'last_30_days');
        System.assertEquals(2, result.size(), 'There should be 2 safety risks for the last 30 days');

        Test.stopTest();
    }

    @IsTest
    static void testGetDataWithNoDateFilter() {
        // Retrieve the subcase
        Case subCase = [SELECT Id FROM Case WHERE Subject = 'Test Sub Case' LIMIT 1];

        SafetyRiskTimelineService service = new SafetyRiskTimelineService();

        Test.startTest();

        // Test data retrieval with no date filter
        List<Object> result = service.getData(subCase.Id, null);
        System.assertEquals(2, result.size(), 'There should be 2 safety risks when no date filter is applied');

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
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals('', service.getBaseUrlForRecordDetail(), 'The base URL for record detail should be empty');
    }

    @IsTest
    static void testRecordIdentifierField() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals('Id', service.getRecordIdentifierField(), 'The record identifier field should be Id');
    }

    @IsTest
    static void testIsSalesforceObject() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals(true, service.isSalesforceObject(), 'This should return true for Salesforce object');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        SafetyRiskTimelineService service = new SafetyRiskTimelineService();
        System.assertEquals(true, service.isUiApiNotSupported(), 'UI API should not be supported');
    }
}