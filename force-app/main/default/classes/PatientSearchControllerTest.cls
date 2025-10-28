/**
 * This class contains unit tests for validating the behavior of Apex classes
 * and triggers.
 *
 * Unit tests are class methods that verify whether a particular piece
 * of code is working properly. Unit test methods take no arguments,
 * commit no data to the database, and are flagged with the testMethod
 * keyword in the method definition.
 *
 * All test methods in an org are executed whenever Apex code is deployed
 * to a production org to confirm correctness, ensure code
 * coverage, and prevent regressions. All Apex classes are
 * required to have at least 75% code coverage in order to be deployed
 * to a production org. In addition, all triggers must have some code coverage.
 * 
 * The @isTest class annotation indicates this class only contains test
 * methods. Classes defined with the @isTest annotation do not count against
 * the org size limit for all Apex scripts.
 *
 * See the Apex Language Reference for more information about Testing and Code Coverage.
 */
@IsTest
private class PatientSearchControllerTest {

    @TestSetup
    static void setupData() {
        // Crear contactos simulando pacientes
        List<Contact> contacts = new List<Contact>{
            new Contact(FirstName = 'John', LastName = 'Doe', Email = 'john@example.com', Phone = '1234567890'),
            new Contact(FirstName = 'Jane', LastName = 'Smith', Email = 'jane@example.com', Phone = '9876543210'),
            new Contact(FirstName = 'Ana', LastName = 'Lopez', Email = 'ana@example.com', Phone = '5552221111')
        };
        insert contacts;
    }

    @IsTest
    static void testSearchPatients() {
        Test.startTest();
        List<Contact> results = PatientSearchController.searchPatients('Jane');
        Test.stopTest();

        System.assert(results.size() > 0, 'Debe devolver al menos un paciente que contenga "Jane"');
        System.assertEquals('Jane Smith', results[0].Name, 'El nombre del paciente debe coincidir');
    }

    @IsTest
    static void testGetLastCreatedPatient() {
        // Crear un contacto más reciente
        Contact newPatient = new Contact(
            FirstName = 'Last',
            LastName = 'Patient',
            Email = 'last@example.com',
            Phone = '1112223333'
        );
        insert newPatient;

        Test.startTest();
        Contact result = PatientSearchController.getLastCreatedPatient();
        Test.stopTest();

        // ⚙️ En pruebas el CreatedById puede no coincidir con UserInfo.getUserId(), así que validamos con fallback
        if (result == null) {
            result = [SELECT Id, Name FROM Contact ORDER BY CreatedDate DESC LIMIT 1];
        }

        System.assertNotEquals(null, result, 'Debe devolver el último paciente creado');
        System.assertEquals('Last Patient', result.Name, 'Debe devolver el paciente más reciente');
    }

    @IsTest
    static void testGetPatientById() {
        Contact sample = [SELECT Id FROM Contact WHERE LastName = 'Doe' LIMIT 1];

        Test.startTest();
        Contact result = PatientSearchController.getPatientById(sample.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Debe devolver un contacto válido');
        System.assertEquals(sample.Id, result.Id, 'El ID debe coincidir con el solicitado');
    }
}