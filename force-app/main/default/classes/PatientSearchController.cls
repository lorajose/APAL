public with sharing class PatientSearchController {

    // 🔍 Buscar pacientes por nombre
    @AuraEnabled(cacheable=true)
    public static List<Contact> searchPatients(String searchKey) {
        return [
            SELECT Id, Name, Email, Phone
            FROM Contact
            WHERE IsPersonAccount = false
            AND Name LIKE :('%' + searchKey + '%') 
            ORDER BY CreatedDate DESC
            LIMIT 10
        ];
    }

    // 🧠 Obtener el último paciente creado por el usuario actual
    @AuraEnabled(cacheable=false)
    public static Contact getLastCreatedPatient() {
        List<Contact> recs = [
            SELECT Id, Name, Email, Phone
            FROM Contact
            WHERE CreatedById = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return recs.isEmpty() ? null : recs[0];
    }

    // ⚙️ Obtener un paciente por Id
    @AuraEnabled(cacheable=true)
    public static Contact getPatientById(Id patientId) {
        return [
            SELECT Id, Name, Email, Phone, CreatedDate
            FROM Contact
            WHERE Id = :patientId
            LIMIT 1
        ];
    }

    // ⚙️ Obtener paciente por Case (ContactId o Patient__c si existe)
    @AuraEnabled(cacheable=true)
    public static Contact getPatientByCaseId(Id caseId) {
        if (caseId == null) return null;
        Map<String, Schema.SObjectField> fields = Case.SObjectType.getDescribe().fields.getMap();
        Boolean hasPatient = fields.containsKey('Patient__c');
        String query = 'SELECT Id, ContactId' + (hasPatient ? ', Patient__c' : '') + ' FROM Case WHERE Id = :caseId LIMIT 1';
        Case c = (Case)Database.query(query);
        Id patientId = c.ContactId;
        if (hasPatient) {
            Id p = (Id)c.get('Patient__c');
            if (p != null) {
                patientId = p;
            }
        }
        if (patientId == null) return null;
        return [
            SELECT Id, Name, Email, Phone, CreatedDate
            FROM Contact
            WHERE Id = :patientId
            LIMIT 1
        ];
    }
}