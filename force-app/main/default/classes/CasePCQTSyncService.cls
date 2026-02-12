public with sharing class CasePCQTSyncService {
    // Keep the wizard/source of truth on Case_PCQT__c. Disable picklist writes.
    private static final Boolean ENABLE_PICKLIST_SYNC = true;
    private static Boolean isSyncingFromCase = false;
    private static Boolean isSyncingFromJunction = false;
    private static Set<Id> caseIdsFromCase = new Set<Id>();
    private static Set<Id> caseIdsFromJunction = new Set<Id>();

    public static void syncFromCase(List<Case> newList, Map<Id, Case> oldMap) {
        if (isSyncingFromJunction) return;

        Set<Id> targetCaseIds = new Set<Id>();
        for (Case c : newList) {
            if (c.Id == null) continue;
            if (caseIdsFromJunction.contains(c.Id)) continue;

            if (oldMap == null || !oldMap.containsKey(c.Id)) {
                if (String.isNotBlank(c.Primary_Clinical_Question_Types__c)) {
                    targetCaseIds.add(c.Id);
                }
                continue;
            }
            Case oldCase = oldMap.get(c.Id);
            if (c.Primary_Clinical_Question_Types__c != oldCase.Primary_Clinical_Question_Types__c) {
                targetCaseIds.add(c.Id);
            }
        }

        if (targetCaseIds.isEmpty()) return;
        isSyncingFromCase = true;
        caseIdsFromCase.addAll(targetCaseIds);

        Map<Id, Case> casesById = new Map<Id, Case>();
        for (Case c : newList) {
            if (targetCaseIds.contains(c.Id)) casesById.put(c.Id, c);
        }

        Set<String> allLabels = new Set<String>();
        Map<Id, List<String>> labelsByCase = new Map<Id, List<String>>();
        for (Id caseId : targetCaseIds) {
            Case c = casesById.get(caseId);
            List<String> labels = splitMultiSelect(c.Primary_Clinical_Question_Types__c);
            labelsByCase.put(caseId, labels);
            for (String label : labels) allLabels.add(label.toLowerCase());
        }

        Map<String, PCQT__c> catalogByLabel = new Map<String, PCQT__c>();
        Map<Id, PCQT__c> catalogById = new Map<Id, PCQT__c>();
        if (!allLabels.isEmpty()) {
            for (PCQT__c pcqt : [
                SELECT Id, Name, Order__c
                FROM PCQT__c
                WHERE Active__c = true
            ]) {
                catalogByLabel.put(pcqt.Name.toLowerCase(), pcqt);
                catalogById.put(pcqt.Id, pcqt);
            }
        }

        List<Case_PCQT__c> existing = [
            SELECT Id, Case__c, PCQT__c
            FROM Case_PCQT__c
            WHERE Case__c IN :targetCaseIds
        ];

        Map<Id, Map<Id, Case_PCQT__c>> existingByCase = new Map<Id, Map<Id, Case_PCQT__c>>();
        for (Case_PCQT__c row : existing) {
            if (!existingByCase.containsKey(row.Case__c)) {
                existingByCase.put(row.Case__c, new Map<Id, Case_PCQT__c>());
            }
            existingByCase.get(row.Case__c).put(row.PCQT__c, row);
        }

        List<Case_PCQT__c> toInsert = new List<Case_PCQT__c>();
        List<Case_PCQT__c> toDelete = new List<Case_PCQT__c>();

        for (Id caseId : targetCaseIds) {
            List<String> labels = labelsByCase.get(caseId);
            Set<Id> desired = new Set<Id>();
            for (String label : labels) {
                PCQT__c pcqt = catalogByLabel.get(label.toLowerCase());
                if (pcqt != null) desired.add(pcqt.Id);
            }

            Map<Id, Case_PCQT__c> currentMap = existingByCase.get(caseId);
            Set<Id> current = currentMap == null ? new Set<Id>() : currentMap.keySet();

            for (Id pcqtId : desired) {
                if (!current.contains(pcqtId)) {
                    PCQT__c pcqt = catalogById.get(pcqtId);
                    Case_PCQT__c row = new Case_PCQT__c(
                        Case__c = caseId,
                        PCQT__c = pcqtId,
                        Case_PCQT_Key__c = String.valueOf(caseId) + '-' + String.valueOf(pcqtId)
                    );
                    if (pcqt != null && pcqt.Order__c != null) {
                        row.Order__c = Integer.valueOf(pcqt.Order__c);
                    }
                    toInsert.add(row);
                }
            }

            if (currentMap != null) {
                for (Id pcqtId : current) {
                    if (!desired.contains(pcqtId)) {
                        toDelete.add(currentMap.get(pcqtId));
                    }
                }
            }
        }

        if (!toInsert.isEmpty()) insert toInsert;
        if (!toDelete.isEmpty()) delete toDelete;

        isSyncingFromCase = false;
        caseIdsFromCase.clear();
    }

    public static void syncFromJunction(Set<Id> caseIds) {
        if (caseIds == null || caseIds.isEmpty()) return;
        if (isSyncingFromCase) return;
        if (!ENABLE_PICKLIST_SYNC) return;

        Set<Id> targetCaseIds = new Set<Id>();
        for (Id caseId : caseIds) {
            if (caseId == null) continue;
            if (caseIdsFromCase.contains(caseId)) continue;
            targetCaseIds.add(caseId);
        }
        if (targetCaseIds.isEmpty()) return;

        isSyncingFromJunction = true;
        caseIdsFromJunction.addAll(targetCaseIds);

        List<Case_PCQT__c> rows = [
            SELECT Case__c, PCQT__r.Name, PCQT__r.Order__c
            FROM Case_PCQT__c
            WHERE Case__c IN :targetCaseIds
            ORDER BY PCQT__r.Order__c NULLS LAST, PCQT__r.Name
        ];

        Set<String> allowedValues = getAllowedPrimaryClinicalQuestionTypes();
        Map<Id, List<String>> labelsByCase = new Map<Id, List<String>>();
        for (Case_PCQT__c row : rows) {
            if (!labelsByCase.containsKey(row.Case__c)) {
                labelsByCase.put(row.Case__c, new List<String>());
            }
            if (row.PCQT__r != null && row.PCQT__r.Name != null) {
                String name = row.PCQT__r.Name;
                if (allowedValues.isEmpty() || allowedValues.contains(name)) {
                    labelsByCase.get(row.Case__c).add(name);
                }
            }
        }

        List<Case> toUpdate = new List<Case>();
        for (Id caseId : targetCaseIds) {
            List<String> labels = labelsByCase.containsKey(caseId) ? labelsByCase.get(caseId) : new List<String>();
            String joined = String.join(labels, ';');
            toUpdate.add(new Case(
                Id = caseId,
                Primary_Clinical_Question_Types__c = joined
            ));
        }

        if (!toUpdate.isEmpty()) {
            // Avoid hard failure if a value isn't assigned to the Case record type picklist.
            Database.update(toUpdate, false);
        }

        isSyncingFromJunction = false;
        caseIdsFromJunction.clear();
    }

    private static List<String> splitMultiSelect(String raw) {
        if (String.isBlank(raw)) return new List<String>();
        List<String> out = new List<String>();
        for (String part : raw.split(';')) {
            String value = part == null ? '' : part.trim();
            if (value != '') out.add(value);
        }
        return out;
    }

    private static Set<String> getAllowedPrimaryClinicalQuestionTypes() {
        Set<String> allowed = new Set<String>();
        Schema.DescribeFieldResult describeResult = Case.Primary_Clinical_Question_Types__c.getDescribe();
        for (Schema.PicklistEntry entry : describeResult.getPicklistValues()) {
            if (entry.isActive()) {
                allowed.add(entry.getValue());
            }
        }
        return allowed;
    }

    // No helper needed for id -> record (using catalogById map).
}