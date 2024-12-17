public with sharing class FlowLauncherController {
   /* @AuraEnabled(cacheable=true)
    public static List<FlowButtonInfo> getFlowsAndCounts(Id caseId) {
        List<FlowButtonInfo> results = new List<FlowButtonInfo>();

        Case caseRecord = [
            SELECT RecordType.DeveloperName, ParentId 
            FROM Case 
            WHERE Id = :caseId 
            LIMIT 1
        ];

        if (caseRecord.RecordType != null) {
            String recordTypeName = caseRecord.RecordType.DeveloperName;
            Id parentId = caseRecord.ParentId;

            if (recordTypeName == 'Care_Navigation' || recordTypeName == 'Care_Request') {
                
                parentId = parentId != null ? parentId : caseId;
                System.debug('ParentMMG: ' + parentId);
                results.addAll(generateFlowButtons(parentId, recordTypeName));
            } else {
                results.addAll(generateFlowButtons(caseId, recordTypeName));
            }
        }

        return results;
    } */

    @AuraEnabled(cacheable=false)
    public static List<FlowButtonInfo> getFlowsAndCounts(Id caseId) {
        List<FlowButtonInfo> results = new List<FlowButtonInfo>();

        // Consulta para obtener el DeveloperName del Record Type asociado al caso
        Case caseRecord = [
            SELECT RecordType.DeveloperName, ParentId  
            FROM Case 
            WHERE Id = :caseId 
            LIMIT 1
        ];

        // Validar si el caso tiene un Record Type
          if (caseRecord.RecordType != null && caseRecord.RecordType.DeveloperName != 'Care_Navigation' && caseRecord.RecordType.DeveloperName != 'Care_Request') {

            // Ejemplo: Lógica para obtener datos de varios objetos
            results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', 'Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseId]));
           }

           // Validar si el caso tiene un Record Type
           if (caseRecord.RecordType != null && caseRecord.RecordType.DeveloperName == 'Care_Navigation') {
             // Agregar a la lista de resultados
             results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', 'Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Support__c', 'Patient Support', 'Patient_Support_Mobile', [SELECT COUNT() FROM Patient_Support__c WHERE Case__c = :caseId]));
           }

           // Validar si el caso tiene un Record Type
           if (caseRecord.RecordType != null && caseRecord.RecordType.DeveloperName == 'Care_Request') {
             // Agregar a la lista de resultados
             results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', 'Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseRecord.ParentId]));
           }
           
     return results;
    }

    private static List<FlowButtonInfo> generateFlowButtons(Id caseId, String recordTypeName) {
        List<FlowButtonInfo> flowButtons = new List<FlowButtonInfo>();
    Map<String, Integer> counts = new Map<String, Integer>();

    // Consultas separadas para cada objeto
    counts.put('Patient_Concern__c', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseId]);
    counts.put('Patient_Substance__c', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseId]);
    counts.put('Patient_Medication__c', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseId]);
    counts.put('Patient_Screener__c', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseId]);
    counts.put('Patient_Safety_Risk__c', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseId]);
 
     System.debug('No estoy aqui MMG: ' + recordTypeName + caseId );
    // Solo realizar esta consulta si el RecordTypeName lo requiere
    if (recordTypeName == 'Care_Navigation') {
        System.debug('Estoy aqui MMG: ' + recordTypeName);
        // Consulta para Patient Support con logs
        Integer patientSupportCount = [SELECT COUNT() FROM Patient_Support__c WHERE Case__c = :caseId];
        System.debug('Patient Support Count: ' + patientSupportCount); // Log para depurar el conteo
        counts.put('Patient_Support__c', [SELECT COUNT() FROM Patient_Support__c WHERE Case__c = :caseId]);
    }

    // Añadir los botones usando los datos
    flowButtons.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', 'Patient_Concerns_Mobile', counts.get('Patient_Concern__c')));
    flowButtons.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', counts.get('Patient_Substance__c')));
    flowButtons.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', counts.get('Patient_Medication__c')));
    flowButtons.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', counts.get('Patient_Screener__c')));
    flowButtons.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', counts.get('Patient_Safety_Risk__c')));

    if (recordTypeName == 'Care_Navigation') {
        flowButtons.add(new FlowButtonInfo('Patient_Support__c', 'Patient Support', 'Patient_Support_Mobile', counts.get('Patient_Support__c')));
    }

    return flowButtons;
    }


    public class FlowButtonInfo {
        @AuraEnabled public String objectName;
        @AuraEnabled public String objectLabel;
        @AuraEnabled public String flowApiName;
        @AuraEnabled public Integer recordCount;

        public FlowButtonInfo(String objectName, String objectLabel, String flowApiName, Integer recordCount) {
            this.objectName = objectName;
            this.objectLabel = objectLabel;
            this.flowApiName = flowApiName;
            this.recordCount = recordCount;
        }
    }
}