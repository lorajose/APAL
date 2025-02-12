public with sharing class RecordTypeController {
    @AuraEnabled(cacheable=true) 
    public static String getRecordTypeName(Id caseId) {
        System.debug('Id resivido: ' + caseId);
        if (caseId == null) {
            System.debug('🔴 Error: caseId recibido es NULL');
            return 'Error: Case ID es nulo';
        }

        List<Case> cases = [SELECT Id, RecordType.Name FROM Case WHERE Id = :caseId LIMIT 1];

        if (cases.isEmpty()) {
            System.debug('⚠ Advertencia: No se encontró el caso con ID: ' + caseId);
            return 'Error: No se encontró el caso';
        }

        System.debug('✅ Record Type Name encontrado: ' + cases[0].RecordType.Name);
        return cases[0].RecordType.Name;
    }
}