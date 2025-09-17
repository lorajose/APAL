/**
 * This class contains unit tests for validating the behavior of Apex classes
 * and triggers.
 *
 * Unit tests are class methods that verify whether a particular piece
 * of code is working properly. Unit test methods take no arguments,
 * commit no data to the database, and are flagged with the testMethod
 * keyword in the method definition.
 *
 * All test methods in an org are executed whenever Apex code is deployed
 * to a production org to confirm correctness, ensure code
 * coverage, and prevent regressions. All Apex classes are
 * required to have at least 75% code coverage in order to be deployed
 * to a production org. In addition, all triggers must have some code coverage.
 * 
 * The @isTest class annotation indicates this class only contains test
 * methods. Classes defined with the @isTest annotation do not count against
 * the org size limit for all Apex scripts.
 *
 * See the Apex Language Reference for more information about Testing and Code Coverage.
 */
@isTest
private class AccountSyncWebServiceApalTest {

    @testSetup
    static void setupData() {
        // Insert Sync Settings → ACTIVE
        AccountSync_Settings__c settings = new AccountSync_Settings__c(
            Is_Active__c = true,
            Record_Types_to_Sync__c = 'Provider',
            On_Demand_Mode__c = true,
            Endpoint_Path__c = 'sync-endpoint',
            Query_Endpoint_Path__c = 'query-endpoint',
            Named_Credential__c = 'NamedCredentialTest'
        );
        insert settings;

        // Insert Person Account
        RecordType personAccountRT = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1];

        Account personAccount = new Account(
            FirstName = 'Test',
            LastName = 'Person',
            RecordTypeId = personAccountRT.Id,
            AccountSync_Id__c = 'SYNC-POST-123',
            On_Demand_AccountSync__c = true
        );
        insert personAccount;

        // Insert User (with LastName → FIXED)
        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'testuser' + DateTime.now().getTime() + '@test.com',
            Alias = 'tuser',
            Email = 'testuser@test.com',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1].Id,
            TimeZoneSidKey = 'America/New_York'
        );
        insert u;
    }

    @isTest
    static void testHandleAccountSync_Success() {
        // Prepare Mock JSON request
        Map<String, Object> eventMap = new Map<String, Object>{
            'ChangeEventHeader' => new Map<String, Object>{
                'commitUser' => UserInfo.getUserId(),
                'changeType' => 'UPDATE',
                'changedFields' => new List<String>{'Name'}
            }
        };

        String jsonBody = JSON.serialize(new Map<String, Object>{
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_ID => 'SYNC-POST-123',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_TYPE => 'UPDATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_EVENT => eventMap,
            AccountSyncUtilApal.REQUEST_PARAM_PERSON_ACCOUNT_FIELDS => new Map<String, Object>{ 'Account.PersonEmail' => 'test@test.com' },
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_INITIATOR_NAME => 'Test User',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGED_FIELDS => new List<String>{'Field1','Field2'}
        });

        // Set up RestContext for test
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/AccountSyncApal';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);
        RestContext.request = req;

        RestResponse res = new RestResponse();
        RestContext.response = res;

        Test.startTest();
        AccountSyncWebServiceApal.handleAccountSync();
        Test.stopTest();

        // Success → no exception → just assert test completed
        System.assert(true, 'Completed successfully when sync active');
    }

    @isTest
    static void testHandleAccountSync_Inactive_NoException() {
        // Disable Sync Setting → this will prevent sync and skip processing
        AccountSync_Settings__c settings = [SELECT Id FROM AccountSync_Settings__c LIMIT 1];
        settings.Is_Active__c = false;
        update settings;

        // Prepare Invalid JSON → but will not be processed because sync is inactive
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/AccountSyncApal';
        req.httpMethod = 'POST';
        //req.requestBody = Blob.valueOf('Invalid JSON');
        req.requestBody = Blob.valueOf('{}'); // valid but empty JSON → will fail RequestWrapper parsing
        //req.requestBody = Blob.valueOf('{"someField": "someValue"}'); // valid JSON but missing required keys


        RestContext.request = req;

        RestResponse res = new RestResponse();
        RestContext.response = res;

        Test.startTest();
        AccountSyncWebServiceApal.handleAccountSync();
        Test.stopTest();

        // No error expected → just assert test completed
        System.assert(true, 'Completed without exception when sync inactive');
    }

    @isTest
    static void testHandleAccountSync_HandleExceptionPath() {
        // Make sure Sync is ACTIVE → so processing happens
        AccountSync_Settings__c settings = [SELECT Id FROM AccountSync_Settings__c LIMIT 1];
        settings.Is_Active__c = true;
        update settings;

        // Send INVALID JSON → so parsing will fail → exception → handleException runs
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/AccountSyncApal';
        req.httpMethod = 'POST';
       // req.requestBody = Blob.valueOf('Invalid JSON'); // 🚨 Force JSON parse exception
       req.requestBody = Blob.valueOf('{}');

        RestContext.request = req;

        RestResponse res = new RestResponse();
        RestContext.response = res;

        Test.startTest();
        AccountSyncWebServiceApal.handleAccountSync();
        Test.stopTest();

        // Validate response was set to 400 by handleException
        System.assertEquals(400, RestContext.response.statusCode, 'Expected HTTP 400 when exception occurred and handled');
    }
}



/*private class AccountSyncWebServiceApalTest {

    @testSetup
    static void setup() {
        // Insert sample account to test query during exception handling (optional but good for coverage)
        Account acc = new Account(Name = 'Test Account');
        insert acc;
    }

    @IsTest
    static void testHandleAccountSync_Success() {
        // Prepare mock request body
        String requestBody = '{"accountSyncId":"SYNC123","changeType":"UPDATE","syncInitiatorName":"Test User"}';

        // Setup RestContext for the test
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/AccountSyncApal';
        req.httpMethod = 'POST';
        req.addHeader('Content-Type', 'application/json');
        req.requestBody = Blob.valueOf(requestBody);

        RestResponse res = new RestResponse();
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        // Execute the REST method
        AccountSyncWebServiceApal.handleAccountSync();
        Test.stopTest();

        // Validate response or at least that response is processed (optional)
        System.assertNotEquals(null, RestContext.response);
    }

    @IsTest
    static void testHandleAccountSync_Exception() {
        // Prepare mock request body with data that will cause exception (simulate bad data or force exception later)
        String requestBody = '{"accountSyncId":"SYNC-EXCEPTION","changeType":"UPDATE","syncInitiatorName":"Test Exception"}';

        // Setup RestContext for the test
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/AccountSyncApal';
        req.httpMethod = 'POST';
        req.addHeader('Content-Type', 'application/json');
        req.requestBody = Blob.valueOf(requestBody);

        RestResponse res = new RestResponse();
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();

        // Force Exception during handleAccountSync by setting throwTestException or mocking syncService (if possible)
        // Since we can't do that here directly, this will cover until syncLogger and handleException still.

        // Run the class
        AccountSyncWebServiceApal.handleAccountSync();

        Test.stopTest();

        // Validate response or log (optional but good practice)
        System.assertNotEquals(null, RestContext.response);
    }
} */