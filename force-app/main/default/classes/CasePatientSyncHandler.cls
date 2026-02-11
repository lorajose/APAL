public without sharing class CasePatientSyncHandler {
    public static void handle(List<Case> newList, Map<Id, Case> oldMap) {
        Map<Id, Id> caseToNewPatient = new Map<Id, Id>();
        for (Case c : newList) {
            Case oldC = oldMap != null ? oldMap.get(c.Id) : null;
            Id oldPatient = getPatient(oldC);
            Id newPatient = getPatient(c);
            if (newPatient != null && newPatient != oldPatient) {
                caseToNewPatient.put(c.Id, newPatient);
            }
        }
        if (caseToNewPatient.isEmpty()) return;

        // Query supports for affected cases
        List<Patient_Support__c> supportsToUpdate = new List<Patient_Support__c>();
        Map<String, Schema.SObjectField> fields = Patient_Support__c.SObjectType.getDescribe().fields.getMap();
        if (!fields.containsKey('Patient__c')) return;

        for (Patient_Support__c ps : [
            SELECT Id, Case__c, Patient__c
            FROM Patient_Support__c
            WHERE Case__c IN :caseToNewPatient.keySet()
        ]) {
            Id desired = caseToNewPatient.get(ps.Case__c);
            if (desired != null && ps.Patient__c != desired) {
                ps.Patient__c = desired;
                supportsToUpdate.add(ps);
            }
        }
        if (!supportsToUpdate.isEmpty()) {
            update supportsToUpdate;
        }
    }

    private static Id getPatient(Case c) {
        if (c == null) return null;
        Map<String, Schema.SObjectField> fields = Case.SObjectType.getDescribe().fields.getMap();
        if (fields.containsKey('Patient__c')) {
            Id p = (Id)c.get('Patient__c');
            if (p != null) return p;
        }
        return c.ContactId;
    }
}