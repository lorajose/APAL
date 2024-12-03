@isTest
public class FlowLauncherControllerTest {

    @isTest
    public static void testGetFlowsAndCounts() {
        // Obtener un RecordType 'Care_Navigation' y 'Care_Request' ya existentes en la organización
        RecordType careNavigationRecordType = [SELECT Id FROM RecordType WHERE DeveloperName = 'Care_Navigation' AND SObjectType = 'Case' LIMIT 1];
        RecordType careRequestRecordType = [SELECT Id FROM RecordType WHERE DeveloperName = 'Care_Request' AND SObjectType = 'Case' LIMIT 1];
        RecordType PatientCaseRecordType = [SELECT Id FROM RecordType WHERE DeveloperName = 'Patient_Case' AND SObjectType = 'Case' LIMIT 1];

        // Crear un caso de prueba con un RecordType 'Care_Navigation'
        Case caseWithCareNavigation = new Case(
            RecordTypeId = careNavigationRecordType.Id,
            Subject = 'Test Case Care Navigation'
        );
        insert caseWithCareNavigation;

        // Crear un caso de prueba con un RecordType 'Care_Request'
        Case caseWithCareRequest = new Case(
            RecordTypeId = careRequestRecordType.Id,
            Subject = 'Test Case Care Request'
        );
        insert caseWithCareRequest;
        
           // Crear un caso de prueba con un RecordType 'Patient_Case'
        Case caseWithPatientCase = new Case(
            RecordTypeId = PatientCaseRecordType.Id,
            Subject = 'Test Case Patient Case'
        );
        insert caseWithPatientCase;
        
        // Crear un registro de tipo 'Substance' si es necesario (esto depende de tu configuración de objeto)
        Substance_List__c substanceRecord = new Substance_List__c(
            Name = 'Test Substance'
        );
        insert substanceRecord;

        // Crear un registro de tipo 'Substance' si es necesario (esto depende de tu configuración de objeto)
        Concern_List__c substanceRecordConcert = new Concern_List__c(
            Name = 'Test Concern'
        );
        insert substanceRecordConcert;

        // Crear registros relacionados a los objetos Patient_Concern__c, Patient_Substance__c, etc.
        Patient_Concern__c concern1 = new Patient_Concern__c(
            Case__c = caseWithCareNavigation.Id,
            Concern__c = substanceRecordConcert.Id  // Asegúrate de que todos los campos obligatorios estén establecidos
        );
        Patient_Concern__c concern2 = new Patient_Concern__c(
            Case__c = caseWithCareRequest.Id,
            Concern__c = substanceRecordConcert.Id  // Asegúrate de que todos los campos obligatorios estén establecidos
        );
        insert new List<Patient_Concern__c>{ concern1, concern2 };

        // Verifica que los registros fueron correctamente insertados
        System.debug('Inserted Patient_Concern__c records: ' + [SELECT Id, Case__c, Concern__c FROM Patient_Concern__c WHERE Case__c IN :new List<Id>{caseWithCareNavigation.Id, caseWithCareRequest.Id, caseWithPatientCase.Id}]);

        // Crear registros para Patient_Substance__c y asignar el campo obligatorio 'Substance_Listing__c'
        Patient_Substance__c substance1 = new Patient_Substance__c(
            Case__c = caseWithCareNavigation.Id,
            Substance_Listing__c = substanceRecord.Id  // Asignar un valor al campo obligatorio
        );
        insert substance1;

        Patient_Substance__c substance2 = new Patient_Substance__c(
            Case__c = caseWithCareRequest.Id,
            Substance_Listing__c = substanceRecord.Id // Asignar un valor al campo obligatorio
        );
        insert substance2;

        // Ejecutar el método que estamos probando para el caso 'Care_Navigation'
        Test.startTest();
        List<FlowLauncherController.FlowButtonInfo> resultsNavigation = FlowLauncherController.getFlowsAndCounts(caseWithCareNavigation.Id);
        List<FlowLauncherController.FlowButtonInfo> resultsRequest = FlowLauncherController.getFlowsAndCounts(caseWithCareRequest.Id);
        List<FlowLauncherController.FlowButtonInfo> resultsCase = FlowLauncherController.getFlowsAndCounts(caseWithPatientCase.Id);
        Test.stopTest();

        // Validar que se hayan agregado los elementos correctos
        System.assertNotEquals(resultsNavigation.size(), 0, 'Se esperaban resultados para Care_Navigation');
        System.assertNotEquals(resultsRequest.size(), 0, 'Se esperaban resultados para Care_Request');
        System.assertNotEquals(resultsCase.size(), 0, 'Se esperaban resultados para Patient_Case');
        System.assert(resultsNavigation[0].objectName == 'Patient_Concern__c', 'El primer flujo debe ser Patient_Concern__c');
        //System.assert(resultsNavigation[0].recordCount == 2, 'El recuento de registros debe ser 2 para Patient_Concern__c');

        // Ejecutar el método que estamos probando para el caso 'Care_Request'
       // Test.startTest();
       // List<FlowLauncherController.FlowButtonInfo> resultsRequest = FlowLauncherController.getFlowsAndCounts(caseWithCareRequest.Id);
       // Test.stopTest();

        // Validar que se hayan agregado los elementos correctos
        //System.assertNotEquals(resultsRequest.size(), 0, 'Se esperaban resultados para Care_Request');
        //System.assert(resultsRequest[0].objectName == 'Patient_Concern__c', 'El primer flujo debe ser Patient_Concern__c');
        //System.assert(resultsRequest[0].recordCount == 2, 'El recuento de registros debe ser 2 para Patient_Concern__c');
    }
}