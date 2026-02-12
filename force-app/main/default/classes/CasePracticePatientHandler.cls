public without sharing class CasePracticePatientHandler {
    public static void handle(
        List<Case> newList,
        Map<Id, Case> oldMap,
        Boolean isInsert,
        Boolean isUpdate,
        Boolean isDelete,
        Boolean isUndelete
    ) {
        Set<String> keysToEnsure = new Set<String>();
        Set<String> keysToEvaluateForDelete = new Set<String>();
        Map<String, Id> keyToPractice = new Map<String, Id>();
        Map<String, Id> keyToPatient = new Map<String, Id>();

        if (!isDelete) {
            for (Case c : newList) {
                if (c.AccountId == null || c.ContactId == null) {
                    continue;
                }
                String key = buildKey(c.AccountId, c.ContactId);
                keysToEnsure.add(key);
                keyToPractice.put(key, c.AccountId);
                keyToPatient.put(key, c.ContactId);
            }
        }

        if (isUpdate || isDelete) {
            for (Case oldCase : oldMap.values()) {
                if (oldCase.AccountId == null || oldCase.ContactId == null) {
                    continue;
                }
                String oldKey = buildKey(oldCase.AccountId, oldCase.ContactId);
                if (isDelete) {
                    keysToEvaluateForDelete.add(oldKey);
                    continue;
                }
                Case newCase = newListMapSafe(newList).get(oldCase.Id);
                if (newCase == null) {
                    continue;
                }
                Boolean unchanged = oldCase.AccountId == newCase.AccountId
                    && oldCase.ContactId == newCase.ContactId;
                if (!unchanged) {
                    keysToEvaluateForDelete.add(oldKey);
                }
            }
        }

        ensurePracticePatients(keysToEnsure, keyToPractice, keyToPatient);
        cleanupPracticePatients(keysToEvaluateForDelete);
    }

    private static Map<Id, Case> newListMapSafe(List<Case> newList) {
        Map<Id, Case> out = new Map<Id, Case>();
        if (newList == null) {
            return out;
        }
        for (Case c : newList) {
            if (c.Id != null) {
                out.put(c.Id, c);
            }
        }
        return out;
    }

    private static String buildKey(Id practiceId, Id patientId) {
        return String.valueOf(practiceId) + '-' + String.valueOf(patientId);
    }

    private static void ensurePracticePatients(
        Set<String> keys,
        Map<String, Id> keyToPractice,
        Map<String, Id> keyToPatient
    ) {
        if (keys == null || keys.isEmpty()) {
            return;
        }

        Map<String, Practice_Patient__c> existing = new Map<String, Practice_Patient__c>();
        for (Practice_Patient__c row : [
            SELECT Id, PracticePatientKey__c
            FROM Practice_Patient__c
            WHERE PracticePatientKey__c IN :keys
        ]) {
            existing.put(row.PracticePatientKey__c, row);
        }

        List<Practice_Patient__c> toInsert = new List<Practice_Patient__c>();
        for (String key : keys) {
            if (existing.containsKey(key)) {
                continue;
            }
            toInsert.add(new Practice_Patient__c(
                Practice__c = keyToPractice.get(key),
                Patient__c = keyToPatient.get(key),
                PracticePatientKey__c = key
            ));
        }

        if (!toInsert.isEmpty()) {
            try {
                insert toInsert;
            } catch (DmlException ex) {
                // Ignore duplicate key races; uniqueness on PracticePatientKey__c protects integrity.
                if (!isDuplicateKeyException(ex)) {
                    throw ex;
                }
            }
        }
    }

    private static void cleanupPracticePatients(Set<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return;
        }

        Set<Id> practiceIds = new Set<Id>();
        Set<Id> patientIds = new Set<Id>();
        for (String key : keys) {
            if (String.isBlank(key) || !key.contains('-')) {
                continue;
            }
            List<String> parts = key.split('-', 2);
            if (parts.size() != 2) {
                continue;
            }
            practiceIds.add((Id)parts[0]);
            patientIds.add((Id)parts[1]);
        }

        Map<String, Integer> caseCountByKey = new Map<String, Integer>();
        if (!practiceIds.isEmpty() && !patientIds.isEmpty()) {
            for (AggregateResult ar : [
                SELECT AccountId acc, ContactId con, COUNT(Id) cnt
                FROM Case
                WHERE AccountId IN :practiceIds
                    AND ContactId IN :patientIds
                GROUP BY AccountId, ContactId
            ]) {
                String key = buildKey((Id) ar.get('acc'), (Id) ar.get('con'));
                caseCountByKey.put(key, (Integer) ar.get('cnt'));
            }
        }

        List<Practice_Patient__c> toDelete = new List<Practice_Patient__c>();
        for (Practice_Patient__c row : [
            SELECT Id, PracticePatientKey__c
            FROM Practice_Patient__c
            WHERE PracticePatientKey__c IN :keys
        ]) {
            if (!caseCountByKey.containsKey(row.PracticePatientKey__c)) {
                toDelete.add(row);
            }
        }

        if (!toDelete.isEmpty()) {
            delete toDelete;
        }
    }

    private static Boolean isDuplicateKeyException(DmlException ex) {
        for (Integer i = 0; i < ex.getNumDml(); i++) {
            String message = ex.getDmlMessage(i);
            if (message != null && message.contains('DUPLICATE_VALUE')) {
                return true;
            }
        }
        return false;
    }
}