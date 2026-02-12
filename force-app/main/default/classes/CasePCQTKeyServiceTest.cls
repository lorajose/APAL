@IsTest
private class CasePCQTKeyServiceTest {
    @IsTest
    static void populateKeys_setsKeyWhenBlank() {
        Id caseId = Id.valueOf('500000000000000AAA');
        Id pcqtId = Id.valueOf('a0w000000000000AAA');

        Case_PCQT__c rec = new Case_PCQT__c(Case__c = caseId, PCQT__c = pcqtId);
        List<Case_PCQT__c> records = new List<Case_PCQT__c>{ rec };

        CasePCQTKeyService.populateKeys(records);

        System.assertEquals(String.valueOf(caseId) + '-' + String.valueOf(pcqtId), rec.Case_PCQT_Key__c);
    }

    @IsTest
    static void populateKeys_skipsWhenAlreadySetOrMissing() {
        Id caseId = Id.valueOf('500000000000001AAA');
        Id pcqtId = Id.valueOf('a0w000000000001AAA');

        Case_PCQT__c withKey = new Case_PCQT__c(
            Case__c = caseId,
            PCQT__c = pcqtId,
            Case_PCQT_Key__c = 'preset'
        );
        Case_PCQT__c missingCase = new Case_PCQT__c(PCQT__c = pcqtId);
        Case_PCQT__c missingPcqt = new Case_PCQT__c(Case__c = caseId);

        List<Case_PCQT__c> records = new List<Case_PCQT__c>{ withKey, missingCase, missingPcqt };

        CasePCQTKeyService.populateKeys(records);

        System.assertEquals('preset', withKey.Case_PCQT_Key__c, 'Should not overwrite existing key');
        System.assertEquals(null, missingCase.Case_PCQT_Key__c, 'Missing Case__c should stay null');
        System.assertEquals(null, missingPcqt.Case_PCQT_Key__c, 'Missing PCQT__c should stay null');
    }
}