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
    
    @isTest
    public static void testGenerateFlowButtons() {
        // Step 1: Set up test data
        // Create Record Types
        RecordType careNavigationRecordType = [SELECT Id FROM RecordType WHERE DeveloperName = 'Care_Navigation' AND SObjectType = 'Case' LIMIT 1];
        RecordType otherRecordType = [SELECT Id FROM RecordType WHERE DeveloperName = 'Care_Request' AND SObjectType = 'Case' LIMIT 1];

        // Create Cases
        Case careNavigationCase = new Case(
            RecordTypeId = careNavigationRecordType.Id,
            Subject = 'Test Care Navigation Case'
        );
        Case otherCase = new Case(
            RecordTypeId = otherRecordType.Id,
            Subject = 'Test Other Case'
        );
        insert new List<Case>{careNavigationCase, otherCase};
            
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

        // Insert related records for careNavigationCase
        List<Patient_Concern__c> concerns = new List<Patient_Concern__c>{
            new Patient_Concern__c(Case__c = careNavigationCase.Id, Concern__c = substanceRecordConcert.Id ),
            new Patient_Concern__c(Case__c = careNavigationCase.Id, Concern__c = substanceRecordConcert.Id )
        };
        insert concerns;

        List<Patient_Substance__c> substances = new List<Patient_Substance__c>{
            new Patient_Substance__c(Case__c = careNavigationCase.Id, Substance_Listing__c = substanceRecord.Id )
        };
        insert substances;

       // List<Patient_Support__c> supports = new List<Patient_Support__c>{
       //     new Patient_Support__c(Case__c = careNavigationCase.Id)
       // };
       // insert supports;

        // Step 2: Test the generateFlowButtons method for Care_Navigation
        Test.startTest();
        List<FlowLauncherController.FlowButtonInfo> careNavigationButtons = FlowLauncherController.generateFlowButtons(careNavigationCase.Id, 'Care_Navigation');
        Test.stopTest();

        // Step 3: Assert results for Care_Navigation
        System.assertEquals(6, careNavigationButtons.size(), 'Expected 6 flow buttons for Care_Navigation.');
        System.assertEquals('Patient_Concern__c', careNavigationButtons[0].objectName, 'Expected first button to be Patient_Concern__c.');
        System.assertEquals(2, careNavigationButtons[0].recordCount, 'Expected 2 Patient Concern records.');

        //System.assertEquals('Patient_Support__c', careNavigationButtons[5].objectName, 'Expected last button to be Patient_Support__c.');
        //System.assertEquals(1, careNavigationButtons[5].recordCount, 'Expected 1 Patient Support record.');

        // Step 4: Test the generateFlowButtons method for other Record Types
       // Test.startTest();
        List<FlowLauncherController.FlowButtonInfo> otherButtons = FlowLauncherController.generateFlowButtons(otherCase.Id, 'Care_Request');
       // Test.stopTest();

        // Step 5: Assert results for Care_Request
        System.assertEquals(5, otherButtons.size(), 'Expected 5 flow buttons for Care_Request.');
        System.assertEquals('Patient_Concern__c', otherButtons[0].objectName, 'Expected first button to be Patient_Concern__c.');
        System.assertEquals(0, otherButtons[0].recordCount, 'Expected 0 Patient Concern records for Care_Request.');
    }
}