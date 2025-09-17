@IsTest
private class AccountSyncFieldMappingSelectorTest {

    @IsTest
    private static void testQueryAllActive() {
        Test.startTest();
        List<AccountSync_Field_Mapping__mdt> result = new AccountSyncFieldMappingSelector().queryAllActive();
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.size() > 0);
    }
}