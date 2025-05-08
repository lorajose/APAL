@IsTest
private class AccountSyncWebServiceTest {

    @IsTest
    private static void testHandleAccountSync_success() {
        String jsonBody = JSON.serialize(new Map<String, Object>{
                'accountSyncId' => 'external-id-123',
                'changeType' => 'UPDATE',
                'syncInitiatorName' => 'VMAP-TEST'
        });

        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/AccountSync';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);
        RestContext.request = req;

        RestResponse res = new RestResponse();
        RestContext.response = res;

        Test.startTest();
        AccountSyncWebService.handleAccountSync();
        Test.stopTest();

        System.assertEquals(null, res.statusCode);
    }

    @IsTest
    private static void testHandleAccountSync_failure() {
        insert new AccountSync_Settings__c(
                Name = 'Default Account Sync setting',
                Is_Active__c = true,
                Endpoint_Path__c = 'services/apexrest/AccountSync',
                Query_Endpoint_Path__c = '/services/data/v60.0/query?q=',
                Named_Credential__c = 'APAL_Org_Auth',
                On_Demand_Mode__c = true,
                Record_Types_to_Sync__c = 'PersonAccount'
        );
        String badLogicJson = JSON.serialize(new Map<String, Object>{
                'accountSyncId' => 'xxx',
                'changeType' => null,
                'syncInitiatorName' => 'fail'
        });

        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/AccountSync';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(badLogicJson);
        RestContext.request = req;

        RestResponse res = new RestResponse();
        RestContext.response = res;

        Test.startTest();
        AccountSyncWebService.handleAccountSync();
        Test.stopTest();

        System.assertEquals(400, res.statusCode, 'Response code should be 400 on failure');
    }
}