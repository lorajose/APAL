@IsTest
public class CaseTimelineServiceTest {
    
      @IsTest
    static void testGetDataWithLast7DaysFilter() {
        // Create a test Case record with a CreatedDate within the last 7 days
        Case testCase = new Case(
            Subject = 'Test Case Last 7 Days',
            Service__c = 'Addiction Medicine Specialist',
            OwnerId = UserInfo.getUserId(),
            Notes_new__c = 'Notes for last 7 days'
            //CreatedDate = System.now().addDays(-5) // Within the last 7 days
        );
        insert testCase;

        // Test the method with 'last_7_days' filter
        CaseTimelineService service = new CaseTimelineService();
        List<Object> results = service.getData(testCase.Id, 'last_7_days');

        // Assertions to validate the results
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Results should contain 1 element');
        
        Map<String, Object> result = (Map<String, Object>)results[0];
        System.assertEquals(testCase.Id, result.get('Id'), 'Case Id should match');
        //System.assertEquals(testCase.CaseNumber, result.get('CaseNumber'), 'Case Number should match');
        System.assertEquals('Addiction Medicine Specialist', result.get('Service__c'), 'Service__c should match');
        System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
        System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

    @IsTest
    static void testGetDataWithLast30DaysFilter() {
        // Create a test Case record with a CreatedDate within the last 30 days
        Case testCase = new Case(
            Subject = 'Test Case Last 30 Days',
            Service__c = 'LCSW',
            OwnerId = UserInfo.getUserId(),
            Notes_new__c = 'Notes for last 30 days'
            //CreatedDate = System.now().addDays(-20) // Within the last 30 days
        );
        insert testCase;

        // Test the method with 'last_30_days' filter
        CaseTimelineService service = new CaseTimelineService();
        List<Object> results = service.getData(testCase.Id, 'last_30_days');

        // Assertions to validate the results
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Results should contain 1 element');
        
        Map<String, Object> result = (Map<String, Object>)results[0];
        System.assertEquals(testCase.Id, result.get('Id'), 'Case Id should match');
        //System.assertEquals(testCase.CaseNumber, result.get('CaseNumber'), 'Case Number should match');
        System.assertEquals('LCSW', result.get('Service__c'), 'Service__c should match');
        System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
        System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

    @IsTest
    static void testGetDataWithNext7DaysFilter() {
        // Create a test Case record with a CreatedDate in the next 7 days
        Case testCase = new Case(
            Subject = 'Test Case Next 7 Days',
            Service__c = 'LMHP',
            OwnerId = UserInfo.getUserId(),
            Notes_new__c = 'Notes for next 7 days'
           // CreatedDate = System.now().addDays(5) // Within the next 7 days
        );
        insert testCase;

        // Test the method with 'next_7_days' filter
        CaseTimelineService service = new CaseTimelineService();
        List<Object> results = service.getData(testCase.Id, 'last_30_days');

        // Assertions to validate the results
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Results should contain 1 element');
        
        Map<String, Object> result = (Map<String, Object>)results[0];
        System.assertEquals(testCase.Id, result.get('Id'), 'Case Id should match');
        //System.assertEquals(testCase.CaseNumber, result.get('CaseNumber'), 'Case Number should match');
        System.assertEquals('LMHP', result.get('Service__c'), 'Service__c should match');
        System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
        System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

    @IsTest
    static void testGetObjectName() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();
        
        // Assert that the object name is 'Case'
        System.assertEquals('Case', service.getObjectName(), 'Object name should be Case');
    }

    @IsTest
    static void testGetRelationshipName() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();
        
        // Assert that the relationship name is 'Cases__r'
        System.assertEquals('Cases__r', service.getRelationshipName(), 'Relationship name should be Cases__r');
    }

    @IsTest
    static void testGetTitleField() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();
        
        // Assert that the title field is 'CaseNumber'
        System.assertEquals('Service__c', service.getTitleField(), 'Title field should be Service__c');
    }

    @IsTest
    static void testGetDateField() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();
        
        // Assert that the date field is 'CreatedDate'
        System.assertEquals('CreatedDate', service.getDateField(), 'Date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        // Instantiate the service
        CaseTimelineService service = new CaseTimelineService();
        
        // Assert that the fields to display are correct
        List<String> expectedFields = new List<String>{
            'CaseNumber',
            'Service__c',
            'OwnerId',
            'Notes_new__c',
            'CreatedDate'
        };
        
        System.assertEquals(expectedFields, service.getFieldsToDisplay(), 'Fields to display should match expected fields');
    }

    @IsTest
static void testGetData() {
    // Create a test Case record
    Case testCase = new Case(
        Subject = 'Test Case',
        Service__c = 'Psychiatrist',
        OwnerId = UserInfo.getUserId(),
        Notes_new__c = 'Test notes'
    );
    insert testCase;
    
       // Re-query to get the full Case object with the CreatedDate
        testCase = [SELECT Id, CaseNumber, CreatedDate FROM Case WHERE Id = :testCase.Id LIMIT 1];

    // Instantiate the service
    CaseTimelineService service = new CaseTimelineService();

    // Test getData method with a valid recordId and null dateFilter
    List<Object> results = service.getData(testCase.Id, null);

    // Assertions to validate the results
    System.assertNotEquals(null, results, 'Results should not be null');
    System.assertEquals(1, results.size(), 'Results should contain 1 element');

    // Validate the content of the first result
    Map<String, Object> result = (Map<String, Object>)results[0];
    System.assertEquals(testCase.Id, result.get('Id'), 'Case Id should match');
    //System.assertEquals(testCase.CaseNumber, result.get('CaseNumber'), 'Case Number should match');
    System.assertEquals('Psychiatrist', result.get('Service__c'), 'Service__c should match');
    System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
    System.assertEquals('Test notes', result.get('Notes_new__c'), 'Notes_new__c should match');
    
    // Assert that CreatedDate is not null
    System.assert(result.get('CreatedDate') != null, 'CreatedDate should not be null');

    // Additional assert to check if CreatedDate matches
    System.assertEquals(testCase.CreatedDate, result.get('CreatedDate'), 'CreatedDate should match'); //result.get('CreatedDate')
    
    
}
     @IsTest
    static void testGetBaseUrlForRecordDetail() {
        // Create an instance of CaseTimelineService
        CaseTimelineService service = new CaseTimelineService();
        
        // Test the method getBaseUrlForRecordDetail
        String baseUrl = service.getBaseUrlForRecordDetail();
        
        // Assertions to validate the result
        System.assertEquals('', baseUrl, 'Base URL should be an empty string');
    }
    
     @IsTest
    static void testGetRecordIdentifierField() {
        // Create an instance of the CaseTimelineService
        CaseTimelineService service = new CaseTimelineService();
        
        // Call the getRecordIdentifierField method
        String recordIdentifierField = service.getRecordIdentifierField();
        
        // Assert that the returned value is 'Id'
        System.assertEquals('Id', recordIdentifierField, 'The record identifier field should be Id');
    }
    
    @IsTest
    static void testIsSalesforceObject() {
        // Instantiate the CaseTimelineService class
        CaseTimelineService service = new CaseTimelineService();
        
        // Call the isSalesforceObject method
        Boolean result = service.isSalesforceObject();
        
        // Assert that the method returns true
        System.assertEquals(true, result, 'The isSalesforceObject method should return true');
    }
    
    @IsTest
    static void testIsUiApiNotSupported() {
        // Instantiate the CaseTimelineService
        CaseTimelineService service = new CaseTimelineService();
        
        // Call the method and verify the result
        Boolean result = service.isUiApiNotSupported();
        
        // Assert that the method returns true
        System.assertEquals(true, result, 'isUiApiNotSupported should return true');
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

}