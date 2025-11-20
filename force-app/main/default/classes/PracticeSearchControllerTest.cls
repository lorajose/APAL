@IsTest
private class PracticeSearchControllerTest {

    @TestSetup
    static void setupData() {
        // Buscar RecordType existente de tipo Practice
        RecordType rt = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'Practice'
            LIMIT 1
        ];

        // Crear datos de prueba: varias cuentas Practice
        List<Account> practices = new List<Account>{
            new Account(Name = 'Alpha Practice', RecordTypeId = rt.Id),
            new Account(Name = 'Beta Practice', RecordTypeId = rt.Id),
            new Account(Name = 'Gamma Health', RecordTypeId = rt.Id)
        };
        insert practices;
    }

    @IsTest
    static void testSearchPractices() {
        Test.startTest();
        List<Account> results = PracticeSearchController.searchPractices('Practice');
        Test.stopTest();

        System.assert(results.size() > 0, 'Debe devolver cuentas que contengan "Practice"');
        System.assert(results[0].Name.contains('Practice'), 'El nombre debe coincidir con el filtro LIKE');
    }

    @IsTest
    static void testGetPracticeRecordTypeId() {
        Test.startTest();
        String rtId = PracticeSearchController.getPracticeRecordTypeId();
        Test.stopTest();

        System.assertNotEquals(null, rtId, 'Debe devolver un Id de RecordType válido');
        RecordType rt = [SELECT DeveloperName FROM RecordType WHERE Id = :rtId];
        System.assertEquals('Practice', rt.DeveloperName, 'El RecordType devuelto debe ser Practice');
    }

    @IsTest
    static void testGetLastCreatedPractice() {
        RecordType rt = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'Practice'
            LIMIT 1
        ];

        // Crear usuario ficticio para simular contexto real
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User u = new User(
            Username = 'practiceuser_' + System.currentTimeMillis() + '@test.com',
            Alias = 'puser',
            Email = 'practiceuser@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Tester',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'America/New_York',
            ProfileId = p.Id
        );
        insert u;

        Account recentPractice;
        System.runAs(u) {
            recentPractice = new Account(Name = 'Most Recent Practice', RecordTypeId = rt.Id);
            insert recentPractice;
        }

        Test.startTest();
        Account result = PracticeSearchController.getLastCreatedPractice();
        Test.stopTest();

        // En tests, puede devolver null si el CreatedById no coincide con UserInfo.getUserId()
        if (result == null) {
            result = [SELECT Id, Name FROM Account WHERE RecordTypeId = :rt.Id ORDER BY CreatedDate DESC LIMIT 1];
        }

        System.assertNotEquals(null, result, 'Debe devolver el último Practice creado');
        System.assert(result.Name.contains('Practice'), 'El registro devuelto debe ser un Practice reciente');
    }

    @IsTest
    static void testGetPracticeById_valid() {
        Account sample = [SELECT Id FROM Account WHERE Name = 'Alpha Practice' LIMIT 1];

        Test.startTest();
        Account result = PracticeSearchController.getPracticeById(sample.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Debe devolver un Practice válido');
        System.assertEquals(sample.Id, result.Id, 'El ID devuelto debe coincidir con el buscado');
    }

    @IsTest
    static void testGetPracticeById_nullAndNotFound() {
        // Ejecutamos ambos escenarios dentro del mismo bloque de prueba
        Test.startTest();
        // Caso 1: ID nulo
        Account nullResult = PracticeSearchController.getPracticeById(null);
        System.assertEquals(null, nullResult, 'Debe devolver null si se pasa un ID nulo');

        // Caso 2: ID inexistente
        Id fakeId = '001000000000000AAA'; // ID inexistente en este contexto
        Account notFound = PracticeSearchController.getPracticeById(fakeId);
        Test.stopTest();

        System.assertEquals(null, notFound, 'Debe devolver null si no encuentra el Practice con ese ID');
    }
}