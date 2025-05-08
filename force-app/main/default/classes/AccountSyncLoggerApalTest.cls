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
@IsTest
private class AccountSyncLoggerApalTest {

@testSetup
static void setupData() {
    // Create test User (for setInitiator(User))
    User u = new User(
        Username = 'testuser' + DateTime.now().getTime() + '@test.com',
        Email='testuser@test.com',
        LastName='User',
        Alias='tuser',
        TimeZoneSidKey='America/New_York',
        LocaleSidKey='en_US',
        EmailEncodingKey='UTF-8',
        ProfileId=UserInfo.getProfileId(),
        LanguageLocaleKey='en_US'
    );
    insert u;
}


    @IsTest
    static void testGetInstanceAndCreateCompleteLog() {
        Test.startTest();
        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();
        AccountSyncLoggerApal.LogInstance log = logger.createCompleteLog();
        System.assertNotEquals(null, log);
        System.assertEquals('Complete', log.log.Status__c);
        Test.stopTest();
    }

    @IsTest
    static void testCreateFailedLogException() {
        Test.startTest();
        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();
        
        // ✅ FIXED → Using CalloutException
        Exception ex = new CalloutException('Sample exception');
        
        AccountSyncLoggerApal.LogInstance log = logger.createFailedLog(ex);
        System.assertNotEquals(null, log);
        System.assertEquals('Failed', log.log.Status__c);
        System.assert(log.log.Error_Message__c.contains('Sample exception'));
        Test.stopTest();
    }

    @IsTest
    static void testCommitLogAndLogs() {
        Test.startTest();
        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();
        AccountSyncLoggerApal.LogInstance log = logger.createCompleteLog();
        logger.commitLog(log);
        logger.commitLogs(new List<AccountSyncLoggerApal.LogInstance>{log});
        Test.stopTest();

        List<Sync_Log__c> logs = [SELECT Id FROM Sync_Log__c];
        System.assert(!logs.isEmpty());
    }

    @IsTest
    static void testSetDebugMethods() {
        Test.startTest();
        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();
        logger.setDebug('TEST HEADER', 'Test debug value');
        logger.setDebug('TEST HEADER', new Map<String, String>{ 'key' => 'value' });
        Test.stopTest();
    }

  /*  @IsTest
    static void testCreateFailedLogHttpResponse() {
        HttpResponse res = new HttpResponse();
        res.setStatusCode(400);
        res.setBody('{"message":"failure"}');

        String jsonEvent = '{' +
            '"Id": "a00000000000001AAA",' +
            '"ChangeEventHeader": {"recordIds": ["001000000000111"], "changeType": "UPDATE"}' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);

        Test.startTest();
        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();
        AccountSyncLoggerApal.LogInstance log = logger.createFailedLog(res, evt, 'SYNC-001');
        System.assertNotEquals(null, log);
        System.assertEquals('Failed', log.log.Status__c);
        Test.stopTest();
    } */

   /* @IsTest
    static void testLogSyncResponse_SuccessAndFailure() {
        HttpResponse resSuccess = new HttpResponse();
        resSuccess.setStatusCode(200);
        resSuccess.setBody('{"message":"success"}');

        HttpResponse resFailure = new HttpResponse();
        resFailure.setStatusCode(500);
        resFailure.setBody('{"message":"error"}');

        String jsonEvent = '{' +
            '"Id": "a00000000000002AAA",' +
            '"ChangeEventHeader": {"recordIds": ["001000000000112"], "changeType": "UPDATE"}' +
        '}';

        AccountChangeEvent evt = (AccountChangeEvent)JSON.deserialize(jsonEvent, AccountChangeEvent.class);

        AccountSyncLoggerApal logger = AccountSyncLoggerApal.getInstance();

        Test.startTest();
        AccountSyncLoggerApal.LogInstance successLog = logger.logSyncResponse(resSuccess, evt, 'SYNC-SUCCESS');
        System.assertEquals('Complete', successLog.log.Status__c);

        AccountSyncLoggerApal.LogInstance failedLog = logger.logSyncResponse(resFailure, evt, 'SYNC-FAIL');
        System.assertEquals('Failed', failedLog.log.Status__c);
        Test.stopTest();
    } */

    @IsTest
    static void testLogInstanceSetters() {
        AccountSyncLoggerApal.LogInstance log = new AccountSyncLoggerApal.LogInstance('Complete');
        log.setSyncId('SYNC-TEST')
           .setRecordId(UserInfo.getUserId())
           .setError('Sample Error')
           .setStackTrace('Sample Stack')
           .setPayload('{"test":"payload"}')
           .setDirection('Inbound')
           .setType('UPDATE')
           .setInitiator('Test Initiator')
           .setInitiator([SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1]);

        System.assertNotEquals(null, log);
    }
}