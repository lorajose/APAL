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
private class AccountSyncUtilApalTest {

    @testSetup
    static void setupData() {
        // Insert Sync Settings
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
            AccountSync_Id__c = 'SYNC-123',
            On_Demand_AccountSync__c = true
        );
        insert personAccount;

        // Insert User
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
    static void testIsAccountSyncActive() {
        System.assertEquals(true, AccountSyncUtilApal.isAccountSyncActive(), 'Expected sync to be active');
    }

    @isTest
    static void testIsRecordTypeInSyncSetting() {
        Account acc = [SELECT Id, RecordTypeId, RecordType.DeveloperName FROM Account LIMIT 1];
        System.assertEquals(true, AccountSyncUtilApal.isRecordTypeInSyncSetting(acc), 'Expected record type to be in sync setting');
    }

    @isTest
    static void testIsAccountSyncAllowedInCurrentMode() {
        Account acc = [SELECT Id, On_Demand_AccountSync__c FROM Account LIMIT 1];
        System.assertEquals(true, AccountSyncUtilApal.isAccountSyncAllowedInCurrentMode(acc), 'Expected sync allowed in On Demand mode');
    }

    @isTest
    static void testGenerateAccountSyncId() {
        String syncId = AccountSyncUtilApal.generateAccountSyncId();
        System.assert(syncId.startsWith(AccountSyncUtilApal.VMAP_PREFIX), 'Expected generated ID to start with VMAP prefix');
    }

    @isTest
    static void testBuildSyncAndQueryEndpoints() {
        String syncEndpoint = AccountSyncUtilApal.buildSyncEndpoint();
        System.assert(syncEndpoint.contains('NamedCredentialTest'), 'Expected sync endpoint to include Named Credential');

        String queryEndpoint = AccountSyncUtilApal.buildQueryEndpoint('SELECT+Id+FROM+Account');
        System.assert(queryEndpoint.contains('query-endpoint'), 'Expected query endpoint to include query path');

        String querySkipService = AccountSyncUtilApal.buildQueryEndpointSkipService('AccountQuery');
        System.assert(querySkipService.contains('AccountQuery'), 'Expected query skip service to include query string');
    }

    @isTest
    static void testRequestWrapperWithBlob() {
        Account acc = [SELECT Id, AccountSync_Id__c, FirstName, LastName FROM Account LIMIT 1];

        // Prepare mock JSON for AccountChangeEvent simulation
        Map<String, Object> eventMap = new Map<String, Object>{
            'ChangeEventHeader' => new Map<String, Object>{
                'commitUser' => UserInfo.getUserId(),
                'changeType' => 'CREATE',
                'changedFields' => new List<String>{'Name'}
            }
        };

        String jsonBody = JSON.serialize(new Map<String, Object>{
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_ID => acc.AccountSync_Id__c,
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_TYPE => 'CREATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_EVENT => eventMap,
            AccountSyncUtilApal.REQUEST_PARAM_PERSON_ACCOUNT_FIELDS => new Map<String, Object>{ 'Account.PersonEmail' => 'test@test.com' },
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_INITIATOR_NAME => 'Test User',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGED_FIELDS => new List<String>{'Field1','Field2'}
        });

        Blob jsonBlob = Blob.valueOf(jsonBody);

        Test.startTest();
        AccountSyncUtilApal.RequestWrapper wrapper = new AccountSyncUtilApal.RequestWrapper(jsonBlob);
        Test.stopTest();

        System.assertEquals(acc.AccountSync_Id__c, wrapper.accountSyncId, 'AccountSyncId should match');
        System.assertEquals('CREATE', wrapper.changeType, 'ChangeType should be CREATE');
        System.assert(wrapper.changedFields.contains('Field1'));
        System.assert(wrapper.syncInitiatorName.contains('[EXT]'), 'Sync Initiator Name should contain [EXT]');
    }

    @isTest
    static void testIsCreateAndUpdateChangeType() {
        // Simulate AccountChangeEvent via JSON
        Map<String, Object> eventMapCreate = new Map<String, Object>{
            'ChangeEventHeader' => new Map<String, Object>{
                'commitUser' => UserInfo.getUserId(),
                'changeType' => 'CREATE',
                'changedFields' => new List<String>{}
            }
        };

        String jsonBodyCreate = JSON.serialize(new Map<String, Object>{
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_ID => 'SYNC-TEST-CREATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_TYPE => 'CREATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_EVENT => eventMapCreate,
            AccountSyncUtilApal.REQUEST_PARAM_PERSON_ACCOUNT_FIELDS => new Map<String, Object>(),
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_INITIATOR_NAME => 'Test User',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGED_FIELDS => new List<String>()
        });

        Blob jsonBlobCreate = Blob.valueOf(jsonBodyCreate);
        AccountSyncUtilApal.RequestWrapper wrapperCreate = new AccountSyncUtilApal.RequestWrapper(jsonBlobCreate);

        System.assertEquals('CREATE', wrapperCreate.changeType);
        
        Map<String, Object> eventMapUpdate = new Map<String, Object>{
            'ChangeEventHeader' => new Map<String, Object>{
                'commitUser' => UserInfo.getUserId(),
                'changeType' => 'UPDATE',
                'changedFields' => new List<String>{}
            }
        };

        String jsonBodyUpdate = JSON.serialize(new Map<String, Object>{
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_ID => 'SYNC-TEST-UPDATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_TYPE => 'UPDATE',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGE_EVENT => eventMapUpdate,
            AccountSyncUtilApal.REQUEST_PARAM_PERSON_ACCOUNT_FIELDS => new Map<String, Object>(),
            AccountSyncUtilApal.REQUEST_PARAM_SYNC_INITIATOR_NAME => 'Test User',
            AccountSyncUtilApal.REQUEST_PARAM_CHANGED_FIELDS => new List<String>()
        });

        Blob jsonBlobUpdate = Blob.valueOf(jsonBodyUpdate);
        AccountSyncUtilApal.RequestWrapper wrapperUpdate = new AccountSyncUtilApal.RequestWrapper(jsonBlobUpdate);

        System.assertEquals('UPDATE', wrapperUpdate.changeType);
    }
}