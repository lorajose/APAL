public with sharing class FlowLauncherController {
    @AuraEnabled(cacheable=true)
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
            results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', '/Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseId]));
            results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseId]));
           }

           // Validar si el caso tiene un Record Type
           if (caseRecord.RecordType != null && caseRecord.RecordType.DeveloperName == 'Care_Navigation') {
             // Agregar a la lista de resultados
             results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', '/Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Support__c', 'Patient Support', 'Patient_Support_Mobile', [SELECT COUNT() FROM Patient_Support__c WHERE Case__c = :caseId]));
           }

           // Validar si el caso tiene un Record Type
           if (caseRecord.RecordType != null && caseRecord.RecordType.DeveloperName == 'Care_Request') {
             // Agregar a la lista de resultados
             results.add(new FlowButtonInfo('Patient_Concern__c', 'Patient Concern', '/Patient_Concerns_Mobile', [SELECT COUNT() FROM Patient_Concern__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Substance__c', 'Patient Substance', 'Patient_Substance_Mobile', [SELECT COUNT() FROM Patient_Substance__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Medication__c', 'Patient Medication', 'Patient_Medication_Mobile', [SELECT COUNT() FROM Patient_Medication__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Screener__c', 'Patient Screener', 'Patient_Screener_Mobile', [SELECT COUNT() FROM Patient_Screener__c WHERE Case__c = :caseRecord.ParentId]));
             results.add(new FlowButtonInfo('Patient_Safety_Risk__c', 'Patient Safety Risk', 'Patient_Safety_Risk_Mobile', [SELECT COUNT() FROM Patient_Safety_Risk__c WHERE Case__c = :caseRecord.ParentId]));
           }
           
     return results;
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