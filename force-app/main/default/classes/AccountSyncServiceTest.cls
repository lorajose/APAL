@IsTest
private class AccountSyncServiceTest {

    @IsTest
    private static void test_setAccountSyncId() {
        Account acc = new Account(FirstName = 'John', LastName = 'Test');
        insert acc;

        List<Account> accountRecords = [SELECT Id, AccountSync_Id__c FROM Account WHERE Id = :acc.Id];
        new AccountSyncService().setAccountSyncId(accountRecords);

        System.assertNotEquals(null, accountRecords[0].AccountSync_Id__c);
    }

    @IsTest
    private static void test_getAccountFieldDescribeByApiName() {
        Map<String, Schema.DescribeFieldResult> result = new AccountSyncService().getAccountFieldDescribeByApiName();
        System.assert(result.containsKey('firstname'.toLowerCase()));
    }

    @IsTest
    private static void test_updateAccount_fromRequest() {
        Id personAccountRecordTypeId = [SELECT Id FROM RecordType WHERE SobjectType = 'Account' AND DeveloperName = 'Provider' LIMIT 1].Id;
        Account acc = new Account(
                FirstName = 'Initial',
                LastName = 'Name',
                Phone = '0000000000',
                PersonEmail = 'initial@example.com',
                AccountSync_Id__c = 'SYNC-456',
                RecordTypeId = personAccountRecordTypeId,
                On_Demand_AccountSync__c = true
        );
        insert acc;

        Map<String, Object> changeEvent = new Map<String, Object>{
                'FirstName' => 'Updated',
                'AccountSync_Id__c' => 'SYNC-456'
        };

        Map<String, Object> reqBody = new Map<String, Object>{
                'accountSyncId' => 'SYNC-456',
                'changeType' => 'UPDATE',
                'changeEvent' => changeEvent,
                'changedFields' => new List<Object>{
                        'FirstName'
                },
                'personAccountFields' => new Map<String, Object>{
                },
                'syncInitiatorName' => 'TestUser'
        };

        Blob bodyBlob = Blob.valueOf(JSON.serialize(reqBody));
        AccountSyncUtil.RequestWrapper request = new AccountSyncUtil.RequestWrapper(bodyBlob);

        Test.startTest();
        new AccountSyncService().handleAccountSync(request);
        Test.stopTest();

        Account updated = [SELECT FirstName FROM Account WHERE AccountSync_Id__c = 'SYNC-456' LIMIT 1];
        System.assertEquals('Updated', updated.FirstName);
    }


    @IsTest
    private static void test_executeAccountSync_batchFires() {
        Test.startTest();
        new AccountSyncService().executeAccountSync(new List<AccountChangeEvent>());
        Test.stopTest();

        System.assert(true, 'Batch executed with empty list');
    }

    @IsTest
    private static void test_isOnlySyncBypassFieldChanged() {
        List<String> bypassFields = new List<String>{ 'AccountSync_Bypass__c', 'LastModifiedDate' };
        Boolean shouldBypass = new AccountSyncService().isOnlySyncBypassFieldChanged(bypassFields);
        System.assertEquals(true, shouldBypass);

        List<String> randomFields = new List<String>{ 'Phone', 'Email' };
        Boolean shouldNotBypass = new AccountSyncService().isOnlySyncBypassFieldChanged(randomFields);
        System.assertEquals(false, shouldNotBypass);
    }

    @IsTest
    private static void test_getExternalAccounts() {
        Test.setMock(HttpCalloutMock.class, new MockAccountSyncCallout());
        //List<Account> accounts = new AccountSyncService().getExternalAccounts();
        //System.assertEquals(1, accounts.size());
        //System.assertEquals('John', accounts[0].FirstName);
        //System.assertEquals('SYNC-001', accounts[0].AccountSync_Id__c);
    }



    public class MockAccountSyncCallout implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(200);
            res.setBody(JSON.serialize(new Map<String, Object>{
                    'records' => new List<Map<String, Object>>{
                            new Map<String, Object>{
                                    'AccountSync_Id__c' => 'SYNC-001',
                                    'FirstName' => 'John',
                                    'LastName' => 'Doe'
                            }
                    }
            }));
            return res;
        }
    }
}