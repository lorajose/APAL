@IsTest
private class PCQTSelectorTypesTest {
    @IsTest
    static void testPOJOs() {
        PCQTSelectorTypes.PCQTItem item = new PCQTSelectorTypes.PCQTItem();
        item.id = Id.valueOf('a0w000000000000AAA');
        item.label = 'Test';
        item.apiKey = 'API-Key';
        item.addictionServices = true;
        item.generalPsychiatry = false;
        item.order = 5;

        System.assertEquals('Test', item.label);
        System.assertEquals('API-Key', item.apiKey);
        System.assertEquals(true, item.addictionServices);
        System.assertEquals(false, item.generalPsychiatry);
        System.assertEquals(5, item.order);

        PCQTSelectorTypes.SaveResult res = new PCQTSelectorTypes.SaveResult();
        res.authoritativeCaseId = Id.valueOf('500000000000000AAA');
        res.insertedCount = 2;
        res.deletedCount = 1;

        System.assertEquals(2, res.insertedCount);
        System.assertEquals(1, res.deletedCount);
        System.assertEquals(Id.valueOf('500000000000000AAA'), res.authoritativeCaseId);
    }
}