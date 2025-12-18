@IsTest
private class CasePCQTKeyServiceTest {
    @IsTest
    static void it_populates_unique_key() {
        // Arrange
        Case c = new Case(Subject = 'Test', Status = 'New', Origin = 'Phone');
        insert c;

        PCQT__c p = new PCQT__c(
            Name = 'Diagnosis clarification',
            API_Key__c = 'diagnosis-clarification',
            Active__c = true,
            General_Psychiatry__c = true
        );
        insert p;

        // Act
        Case_PCQT__c j = new Case_PCQT__c(Case__c = c.Id, PCQT__c = p.Id);
        insert j;

        // Assert
        Case_PCQT__c saved = [SELECT Case_PCQT_Key__c FROM Case_PCQT__c WHERE Id = :j.Id];
        System.assertEquals(c.Id + '-' + p.Id, saved.Case_PCQT_Key__c);
    }
}