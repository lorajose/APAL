/**
 * Auto Generated and Deployed by the Declarative Lookup Rollup Summaries Tool package (dlrs)
 **/
@IsTest
private class dlrs_Care_NoteTest
{
    @IsTest
    private static void testTrigger()
    {
        // Force the dlrs_Care_NoteTrigger to be invoked, fails the test if org config or other Apex code prevents this.
        dlrs.RollupService.testHandler(new Care_Note__c());
    }
}