public with sharing class PCQTSelectorController {

    private static Id resolveAuthoritativeCaseId(Id recordId) {
        if (recordId == null) return null;
        // Usa el resolver existente en GPCaseService para subcases/patient case.
        return GPCaseService.getAuthoritativeCaseId(recordId);
    }

    @AuraEnabled(cacheable=true)
    public static List<PCQTSelectorTypes.PCQTItem> getPcqtCatalog(String caseType) {
        // Determine flag
        Boolean wantsAddiction = (caseType != null && caseType.toLowerCase().contains('addiction'));
        Boolean wantsGeneral   = (caseType == null || caseType.toLowerCase().contains('general'));

        String whereFlags = wantsAddiction ? 'Addiction_Services__c = true' : 'General_Psychiatry__c = true';
        // si quieres soportar ambos a la vez, cambia la lógica a OR.

        List<PCQT__c> rows = Database.query(
            'SELECT Id, Name, API_Key__c, Addiction_Services__c, General_Psychiatry__c, Active__c, Order__c ' +
            'FROM PCQT__c ' +
            'WHERE Active__c = true AND ' + whereFlags + ' ' +
            'ORDER BY Order__c NULLS LAST, Name ASC'
        );

        List<PCQTSelectorTypes.PCQTItem> out = new List<PCQTSelectorTypes.PCQTItem>();
        for (PCQT__c r : rows) {
            PCQTSelectorTypes.PCQTItem i = new PCQTSelectorTypes.PCQTItem();
            i.id = r.Id;
            i.label = r.Name;
            i.apiKey = r.API_Key__c;
            i.addictionServices = r.Addiction_Services__c;
            i.generalPsychiatry = r.General_Psychiatry__c;
            i.order = (r.Order__c == null) ? null : Integer.valueOf(r.Order__c);
            out.add(i);
        }
        return out;
    }

    @AuraEnabled(cacheable=true)
    public static List<Id> getPcqtSelections(Id recordId) {
        Id caseId = resolveAuthoritativeCaseId(recordId);

        List<Case_PCQT__c> rows = [
            SELECT PCQT__c
            FROM Case_PCQT__c
            WHERE Case__c = :caseId
        ];

        List<Id> ids = new List<Id>();
        for (Case_PCQT__c r : rows) ids.add(r.PCQT__c);
        return ids;
    }

    @AuraEnabled
    public static PCQTSelectorTypes.SaveResult savePcqtSelections(Id recordId, List<Id> selectionIds) {
        Id caseId = resolveAuthoritativeCaseId(recordId);
        Set<Id> desired = new Set<Id>();
        if (selectionIds != null) desired.addAll(selectionIds);

        // Current
        List<Case_PCQT__c> current = [
            SELECT Id, PCQT__c
            FROM Case_PCQT__c
            WHERE Case__c = :caseId
        ];

        Set<Id> currentIds = new Set<Id>();
        Map<Id, Case_PCQT__c> byPcqt = new Map<Id, Case_PCQT__c>();
        for (Case_PCQT__c r : current) {
            currentIds.add(r.PCQT__c);
            byPcqt.put(r.PCQT__c, r);
        }

        // Insert missing
        List<Case_PCQT__c> toInsert = new List<Case_PCQT__c>();
        // Obtener orden desde el catálogo para preservar el orden seleccionado
        Map<Id, Integer> orderByPcqt = new Map<Id, Integer>();
        List<PCQT__c> desiredCatalog = [SELECT Id, Order__c FROM PCQT__c WHERE Id IN :desired];
        for (PCQT__c pcqt : desiredCatalog) {
            orderByPcqt.put(pcqt.Id, pcqt.Order__c == null ? null : Integer.valueOf(pcqt.Order__c));
        }

        for (Id pcqtId : desired) {
            if (!currentIds.contains(pcqtId)) {
                toInsert.add(new Case_PCQT__c(
                    Case__c = caseId,
                    PCQT__c = pcqtId,
                    Case_PCQT_Key__c = String.valueOf(caseId) + '-' + String.valueOf(pcqtId),
                    Order__c = orderByPcqt.containsKey(pcqtId) ? orderByPcqt.get(pcqtId) : null
                ));
            }
        }

        // Delete removed
        List<Case_PCQT__c> toDelete = new List<Case_PCQT__c>();
        for (Id pcqtId : currentIds) {
            if (!desired.contains(pcqtId)) {
                toDelete.add(byPcqt.get(pcqtId));
            }
        }

        if (!toInsert.isEmpty()) insert toInsert; // trigger llenará Case_PCQT_Key__c
        if (!toDelete.isEmpty()) delete toDelete;

        PCQTSelectorTypes.SaveResult res = new PCQTSelectorTypes.SaveResult();
        res.authoritativeCaseId = caseId;
        res.insertedCount = toInsert.size();
        res.deletedCount = toDelete.size();
        return res;
    }
}