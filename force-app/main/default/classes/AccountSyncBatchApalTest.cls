@IsTest
private class AccountSyncBatchApalTest {

    @TestSetup
    private static void testSetup() {
        insert new AccountSync_Settings__c(
                Name = 'Default Account Sync setting',
                Is_Active__c = true,
                Endpoint_Path__c = 'services/apexrest/AccountSync',
                Query_Endpoint_Path__c = '/services/data/v60.0/query?q=',
                Named_Credential__c = 'APAL_Org_Auth',
                On_Demand_Mode__c = true,
                Record_Types_to_Sync__c = 'Provider'
        );
    }
    @IsTest
    private static void accountSyncBatchExecuteTest() {
        Id personAccountRecordTypeId = [SELECT Id FROM RecordType WHERE SobjectType = 'Account' AND DeveloperName = 'Provider' LIMIT 1].Id;
        Account testAccountRecord = new Account(
                FirstName = 'Test',
                LastName = 'Account',
                Phone = '123-456-7890',
                On_Demand_AccountSync__c = true,
                RecordTypeId = personAccountRecordTypeId
        );

        Test.setMock(HttpCalloutMock.class, new AccountSyncCalloutMock());

        Test.startTest();

        Test.enableChangeDataCapture();

        insert testAccountRecord;

        Test.getEventBus().deliver();

        Test.stopTest();

        AsyncApexJob accountSyncBatchJob = [
                SELECT
                        Id
                        , Status
                        , ApexClass.Name
                        , JobType
                FROM AsyncApexJob
                ORDER BY CreatedDate DESC
                LIMIT 1
        ];

        Sync_Log__c syncLog = [SELECT Id, Status__c FROM Sync_Log__c LIMIT 1];
        String LOG_STATUS_COMPLETE = 'Complete';
        System.assertEquals(
                AccountSyncLoggerApal.LOG_STATUS_COMPLETE,
                syncLog.Status__c,
                'Sync_Log__c record status should be Complete'
        );

        System.assertEquals(
                'Completed',
                accountSyncBatchJob.Status,
                'Status of the batch job should be completed'
        );
        System.assertEquals(
                'BatchApex',
                accountSyncBatchJob.JobType,
                'Job type should be BatchApex'
        );
        System.assertEquals(
                'AccountSyncBatch',
                accountSyncBatchJob.ApexClass.Name,
                'Batch job apex class name should be AccountSyncBatch'
        );
    }

    @IsTest
    private static void accountSyncBatchExecuteExceptionTest() {
        Id personAccountRecordTypeId = [SELECT Id FROM RecordType WHERE SobjectType = 'Account' AND DeveloperName = 'Provider' LIMIT 1].Id;
        Account testAccountRecord = new Account(
                FirstName = 'Test',
                LastName = 'Account',
                Phone = '123-456-7890',
                On_Demand_AccountSync__c = true,
                RecordTypeId = personAccountRecordTypeId
        );

        Test.startTest();

        Test.enableChangeDataCapture();

        insert testAccountRecord;

        Test.getEventBus().deliver();

        Test.stopTest();

        AsyncApexJob accountSyncBatchJob = [
                SELECT
                        Id
                        , Status
                        , ApexClass.Name
                        , JobType
                FROM AsyncApexJob
                ORDER BY CreatedDate DESC
                LIMIT 1
        ];

        Sync_Log__c syncLog = [SELECT Id, Status__c FROM Sync_Log__c LIMIT 1];
        String LOG_STATUS_FAILED = 'Failed';
        System.assertEquals(
                AccountSyncLoggerApal.LOG_STATUS_FAILED,
                syncLog.Status__c,
                'Sync_Log__c record status should be Failed'
        );

        System.assertEquals(
                'Completed',
                accountSyncBatchJob.Status,
                'Status of the batch job should be completed'
        );
        System.assertEquals(
                'BatchApex',
                accountSyncBatchJob.JobType,
                'Job type should be BatchApex'
        );
        System.assertEquals(
                'AccountSyncBatch',
                accountSyncBatchJob.ApexClass.Name,
                'Batch job apex class name should be AccountSyncBatch'
        );
    }

    public class AccountSyncCalloutMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"test":"test"}');
            res.setStatusCode(200);
            return res;
        }
    }
}