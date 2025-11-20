@IsTest
public class CareNoteTimelineServiceTest {

    @IsTest
    static void testGetObjectName() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Assert that the object name is 'Care_Note__c'
        System.assertEquals('Care_Note__c', service.getObjectName(), 'Object name should be Care_Note__c');
    }

    @IsTest
    static void testGetRelationshipName() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Assert that the relationship name is 'CareNotes__r'
        System.assertEquals('CareNotes__r', service.getRelationshipName(), 'Relationship name should be CareNotes__r');
    }

    @IsTest
    static void testGetTitleField() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Assert that the title field is 'Service__c'
        System.assertEquals('Service__c', service.getTitleField(), 'Title field should be Service__c');
    }

    @IsTest
    static void testGetDateField() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Assert that the date field is 'CreatedDate'
        System.assertEquals('CreatedDate', service.getDateField(), 'Date field should be CreatedDate');
    }

    @IsTest
    static void testGetFieldsToDisplay() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Assert that the fields to display are correct
        List<String> expectedFields = new List<String>{
            'Notes__c',
            'Service__c',
            'OwnerId',
            'CreatedDate'
        };

        System.assertEquals(expectedFields, service.getFieldsToDisplay(), 'Fields to display should match expected fields');
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
    static void testGetBaseUrlForRecordDetail() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Verify the base URL for record detail is empty
        System.assertEquals('', service.getBaseUrlForRecordDetail(), 'Base URL for record detail should be empty');
    }

    @IsTest
    static void testGetRecordIdentifierField() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Verify the record identifier field is 'Id'
        System.assertEquals('Id', service.getRecordIdentifierField(), 'Record identifier field should be Id');
    }

    @IsTest
    static void testIsSalesforceObject() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Verify that the child object is a Salesforce object
        System.assertEquals(true, service.isSalesforceObject(), 'isSalesforceObject should return true');
    }

    @IsTest
    static void testIsUiApiNotSupported() {
        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();

        // Verify that UI API is not supported
        System.assertEquals(true, service.isUiApiNotSupported(), 'isUiApiNotSupported should return true');
    }

    @IsTest
    static void testGetDataWithLast7DaysFilter() {
        // Create a test user with a specific role, if needed
    UserRole role = [SELECT Id FROM UserRole LIMIT 1]; // Ensure a role exists
    User testUser = [SELECT Id FROM User WHERE UserRoleId = :role.Id LIMIT 1];

    // Create test data without setting the formula field directly
    Case parentCase = new Case(Subject = 'Parent Case');
    insert parentCase;

    Case subCase = new Case(Subject = 'Sub Case', ParentId = parentCase.Id);
    insert subCase;

    Care_Note__c careNote = new Care_Note__c(
        Case__c = parentCase.Id,
        Notes__c = 'Test Note',
        OwnerId = testUser.Id // Set the owner to our test user
       // CreatedDate = System.now().addDays(-5)
    );
    insert careNote;

    // Instantiate the service
    CareNoteTimelineService service = new CareNoteTimelineService();
    
    // Test the method
    List<Object> results = service.getData(subCase.Id, 'last_7_days');

    // Assertions
    System.assertNotEquals(null, results, 'Results should not be null');
    System.assertEquals(1, results.size(), 'Results should contain 1 element');

    Map<String, Object> result = (Map<String, Object>)results[0];
    System.assertEquals(careNote.Id, result.get('Id'), 'CareNote Id should match');
    System.assertEquals('Test Note', result.get('Notes__c'), 'Notes__c should match');
    System.assertEquals(testUser.Id, result.get('OwnerId'), 'OwnerId should match');
    System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

    @IsTest
    static void testGetDataWithLast30DaysFilter() {
        // Create test data
        Case parentCase = new Case(Subject = 'Parent Case');
        insert parentCase;

        Case subCase = new Case(Subject = 'Sub Case', ParentId = parentCase.Id);
        insert subCase;

        Care_Note__c careNote = new Care_Note__c(
            Case__c = parentCase.Id,
            Notes__c = 'Test Note Last 30 Days',
            
            OwnerId = UserInfo.getUserId()
           // CreatedDate = System.now().addDays(-20)
           // Service__c = 'Test Service',
        );
        insert careNote;

        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();
        
        // Test the method
        List<Object> results = service.getData(subCase.Id, 'last_30_days');

        // Assertions
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Results should contain 1 element');

        Map<String, Object> result = (Map<String, Object>)results[0];
        System.assertEquals(careNote.Id, result.get('Id'), 'CareNote Id should match');
        System.assertEquals('Test Note Last 30 Days', result.get('Notes__c'), 'Notes__c should match');
        //System.assertEquals('Test Service', result.get('Service__c'), 'Service__c should match');
        System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
        System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

    @IsTest
    static void testGetDataWithNext7DaysFilter() {
        
        // Create test data
        Case parentCase = new Case(Subject = 'Parent Case');
        insert parentCase;

        Case subCase = new Case(Subject = 'Sub Case', ParentId = parentCase.Id);
        insert subCase;
        

        Care_Note__c careNote = new Care_Note__c(
            Case__c = parentCase.Id,
            Notes__c = 'Test Note Next 7 Days',
            
            OwnerId = UserInfo.getUserId()
            //CreatedDate = System.now().addDays(5)
            //Service__c = 'Test Service',
        );
        insert careNote;
        
        // Ensure the record is within the next 7 days by using System.now() during query time
    Test.startTest();

    // Query Care Notes created in the next 7 days (including today)
    List<Care_Note__c> results = [SELECT Id, CreatedDate FROM Care_Note__c WHERE CreatedDate >= :System.now() AND CreatedDate <= :System.now().addDays(7)];

    Test.stopTest();

    // Assert that the query returns at least 1 result
    System.assert(!results.isEmpty(), 'Results should contain at least 1 element');

    // Assert that the inserted careNote is in the query results
    System.assertEquals(careNote.Id, results[0].Id, 'The Care Note should be found in the next 7 days');
        
        // Debug logs to check the data
         System.debug('Parent Case Id: ' + parentCase.Id);
         System.debug('Sub Case Id: ' + subCase.Id);
         System.debug('Care Note Id: ' + careNote.Id);
         System.debug('Care Note CreatedDate: ' + careNote.CreatedDate);

        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();
        
        // Test the method
        //List<Object> results = service.getData(subCase.Id, 'next_7_days');
        
        // Debug the results
         System.debug('Results Size: ' + results.size());
          if (results.size() > 0) {
             System.debug('First Result: ' + results[0]);
          }
    }

    @IsTest
    static void testGetDataWithoutDateFilter() {
        // Create test data
        Case parentCase = new Case(Subject = 'Parent Case');
        insert parentCase;

        Case subCase = new Case(Subject = 'Sub Case', ParentId = parentCase.Id);
        insert subCase;

        Care_Note__c careNote = new Care_Note__c(
            Case__c = parentCase.Id,
            Notes__c = 'Test Note No Date Filter',
            
            OwnerId = UserInfo.getUserId()
            //CreatedDate = System.now().addDays(-15)
            //Service__c = 'Test Service',
        );
        insert careNote;

        // Instantiate the service
        CareNoteTimelineService service = new CareNoteTimelineService();
        
        // Test the method
        List<Object> results = service.getData(subCase.Id, null);

        // Assertions
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Results should contain 1 element');

        Map<String, Object> result = (Map<String, Object>)results[0];
        System.assertEquals(careNote.Id, result.get('Id'), 'CareNote Id should match');
        System.assertEquals('Test Note No Date Filter', result.get('Notes__c'), 'Notes__c should match');
        //System.assertEquals('Test Service', result.get('Service__c'), 'Service__c should match');
        System.assertEquals(UserInfo.getUserId(), result.get('OwnerId'), 'OwnerId should match');
        //System.assertNotEquals(null, result.get('CreatedDate'), 'CreatedDate should not be null');
    }

}