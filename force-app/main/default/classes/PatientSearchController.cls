public with sharing class PatientSearchController {

    // 🔍 Buscar pacientes por nombre
    @AuraEnabled(cacheable=true)
    public static List<Contact> searchPatients(String searchKey) {
        return [
            SELECT Id, Name, Email, Phone
            FROM Contact
            WHERE Name LIKE :('%' + searchKey + '%')
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
}