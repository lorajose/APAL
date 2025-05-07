@IsTest
private class AccountSyncBatchApalTest {

    // Mock HTTP callout success
    private class MockHttpCalloutSuccess implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"status":"success"}');
            res.setStatusCode(200);
            return res;
        }
    }

    // Mock HTTP callout error (simulate server error)
    private class MockHttpCalloutError implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('{"error":"server error"}');
            return res;
        }
    }

    @testSetup
    static void setupData() {
        // ✅ Get Person Account RecordType only
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1];

        // ✅ Insert Person Account (valid with FirstName and LastName)
        Account acc = new Account(
            RecordTypeId = rt.Id,
            FirstName = 'Test',
            LastName = 'Account',
            AccountSync_Id__c = 'SYNC123'
        );
        insert acc;
    }

    @IsTest
    static void testBatchSuccess() {
        // Prepare AccountChangeEvent (mock via JSON.deserialize)
        String jsonEvent = '{' +
            '"Id": "a00000000000001AAA",' +
            '"ChangeEventHeader": {"recordIds": ["' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"], "changeType": "UPDATE"},' +
            '"AccountId": "' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);

        List<AccountChangeEvent> changeEvents = new List<AccountChangeEvent> { evt };

        Map<String, Account> accountMap = new Map<String, Account>();
        Account acc = [SELECT Id, AccountSync_Id__c FROM Account LIMIT 1];
        accountMap.put(evt.Id, acc);

        // ✅ Set mock HTTP response for success
        Test.setMock(HttpCalloutMock.class, new MockHttpCalloutSuccess());

        Test.startTest();

        // Run batch
        AccountSyncBatchApal batch = new AccountSyncBatchApal(changeEvents, accountMap);
        Id batchId = Database.executeBatch(batch);

        Test.stopTest();

        System.assertNotEquals(null, batchId);
    }

    @IsTest
    static void testBatchWithError() {
        // Prepare AccountChangeEvent (mock via JSON.deserialize)
        String jsonEvent = '{' +
            '"Id": "a00000000000002AAA",' +
            '"ChangeEventHeader": {"recordIds": ["' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"], "changeType": "UPDATE"},' +
            '"AccountId": "' + String.valueOf([SELECT Id FROM Account LIMIT 1].Id) + '"' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);

        List<AccountChangeEvent> changeEvents = new List<AccountChangeEvent> { evt };

        Map<String, Account> accountMap = new Map<String, Account>();
        Account acc = [SELECT Id, AccountSync_Id__c FROM Account LIMIT 1];
        accountMap.put(evt.Id, acc);

        // ✅ Set mock HTTP response for error
        Test.setMock(HttpCalloutMock.class, new MockHttpCalloutError());

        Test.startTest();

        // Run batch
        AccountSyncBatchApal batch = new AccountSyncBatchApal(changeEvents, accountMap);
        Id batchId = Database.executeBatch(batch);

        Test.stopTest();

        System.assertNotEquals(null, batchId);
    }
}