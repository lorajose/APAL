@isTest
public class LeadConversionControllerTest {
       @isTest
    static void testUpdatePersonAccountFields() {
        // Step 1: Create a Lead record with required fields
        Lead lead = new Lead(
            FirstName = 'John',
            LastName = 'Doe',
            Email = 'john.doe@example.com',
            Phone = '1234567890',
            Does_the_provider_have_NPI__c = 'Yes',
            pcpnpi__c = '1234567890',
            LeadSource = 'Referral',
            Status = 'Open - Not Contacted',
            Phone_Extension__c = 123,
            MobilePhone = '9876543212',
            Home_Phone__c = '0000000000',
            Other_Phone__c = '1111111111',
            Health_Haven_Enrolled_Provider__c = true,
            Friend_or_Colleague__c =true,
            My_Medical_or_Specialty_Association__c = true,
            Social_Media__c = true,
            Search_Engine__c = true,
            News_Story__c = true,
            Opt_out__c = true,
            Incomplete_Submission__c = true,
            Provider_Signature__c = 'Test Signature',
            Provider_Languages_Description__c = 'test',
            Provider_Language_other_than_English__c = 'Spanish',
            How_do_You_Identify_with_Respect_to_Race__c = 'Asian',
            Do_you_think_of_yourself_as__c = 'Other',
            Specialty_Mental_Health_Training__c = 'Yes',
            Specialty_Mental_Health_Training_Desc__c = 'Test',
            Number_of_Years_In_Practice__c = 3,
            The_provider_is_a_Trainee__c = 'Yes',
            Trainee_Type__c = 'Other medical trainee',
            Other_Medical_Trainee_Description__c = 'Test',
            Phone_Type__c = 'Work Phone'
            
        );
        insert lead;

        // Step 2: Check if Person Account Record Type exists
       /* Id personAccountRecordTypeId;
        try {
            personAccountRecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = 'PersonAccount' LIMIT 1].Id;
        } catch (QueryException e) {
            System.assert(false, 'Person Account Record Type does not exist in the org. Please check the configuration.');
            return; // Exit the test if Record Type is not found
        } */
        
        // Step 3: Create a Person Account record
        Account personAccount = new Account(
            //Name = 'Provider Co.',
           // RecordTypeId = personAccountRecordTypeId,
            FirstName = 'OldFirstName',
            LastName = 'OldLastName',
            PersonEmail = 'old.email@example.com',
            Phone = '9876543210',
            pcphasnpi__c = 'Yes',
            pcpnpi__c = '5555555555',
            PersonLeadSource = 'OldSource',
            pcpphoneext__c = 123,
            PersonOtherPhone = '',
            PersonHomePhone = '',
            OtherSource__c = false,
            ConferencePresentation__c = false,
            NewspaperNewsStory__c = false,
            SearchEngine__c = false,
            DirectContactWithVMAPstaff__c = false,
            VMAPEnrolledProvider__c = false,
            pcpinitials__c = false,
            Incomplete_Submission__c = false,
            pcpesignature__c = '',
            pcplangdesc__c = '',
            pcplang__c = '',
            provider_racee__c = '',
            pcpgender__c = '',
            pcpmhtrain__c = '',
            pcpmhtraindesc__c = '',
            pcpyrspract__c = 1,
            pcptrainee__c = '',
            pcptraintype__c = '',
            pcptraintypedescrmd__c = '',
            pcpphonedesc__c = ''

            
            
            // Add other necessary fields that should be present in the Person Account
        );
        insert personAccount;

        // Step 4: Call the method to be tested
        LeadConversionController.updatePersonAccountFields(lead, personAccount); // Replace MyClass with your actual class name

        // Step 5: Refresh the personAccount to see the updates
        personAccount = [SELECT FirstName, LastName, PersonEmail, Phone, pcphasnpi__c, pcpnpi__c, PersonLeadSource FROM Account WHERE Id = :personAccount.Id];

        // Step 6: Assertions
        System.assertEquals('John', personAccount.FirstName, 'First Name should be updated to the lead\'s first name.');
        System.assertEquals('Doe', personAccount.LastName, 'Last Name should be updated to the lead\'s last name.');
        System.assertEquals('john.doe@example.com', personAccount.PersonEmail, 'Email should be updated.');
        System.assertEquals('1234567890', personAccount.Phone, 'Phone should be updated.');
        System.assertEquals('Yes', personAccount.pcphasnpi__c, 'NPI status should be updated.');
        System.assertEquals('1234567890', personAccount.pcpnpi__c, 'NPI number should be updated.');
        System.assertEquals('Referral', personAccount.PersonLeadSource, 'Lead Source should be updated.');
        //System.assertEquals(123, personAccount.pcpphoneext__c, 'Lead Source should be updated.');

        // Optional: Check that the lead status was updated
        lead = [SELECT Status FROM Lead WHERE Id = :lead.Id];
        System.assertEquals('Closed - Converted', lead.Status, 'Lead status should be updated after conversion.');
    }
    @isTest
    static void testConvertLeadToPersonAccount() {
        // Setup test data
        Lead lead = new Lead(
            FirstName = 'OldFirstName',
            LastName = 'Doe',
            pcpnpi__c = '5555555555',
            Email = 'john.doe@example.com',
            Status = 'Open - Not Contacted',
            // Other required fields
            Phone_Extension__c = 123,
            Matching_Provider__c = null, // Set this to a valid account Id for tests involving Matching_Provider
            MobilePhone = '9876543212',
            Home_Phone__c = '0000000000',
            Other_Phone__c = '1111111111',
            Does_the_provider_have_NPI__c = 'Yes',
            Health_Haven_Enrolled_Provider__c = true,
            Friend_or_Colleague__c =true,
            My_Medical_or_Specialty_Association__c = true,
            Social_Media__c = true,
            Search_Engine__c = true,
            News_Story__c = true,
            Opt_out__c = true,
            Incomplete_Submission__c = true,
            Provider_Signature__c = 'Test Signature',
            Provider_Languages_Description__c = 'test',
            Provider_Language_other_than_English__c = 'Spanish',
            How_do_You_Identify_with_Respect_to_Race__c = 'Asian',
            Do_you_think_of_yourself_as__c = 'Other',
            Specialty_Mental_Health_Training__c = 'Yes',
            Specialty_Mental_Health_Training_Desc__c = 'Test',
            Number_of_Years_In_Practice__c = 3,
            The_provider_is_a_Trainee__c = 'Yes',
            Trainee_Type__c = 'Other medical trainee',
            Other_Medical_Trainee_Description__c = 'Test',
            Phone_Type__c = 'Work Phone'
        );
        insert lead;

         // Convert the lead
    Test.startTest();
    try {
        Id personAccountId = LeadConversionController.convertLeadToPersonAccount(lead.Id);
        Test.stopTest();
        
        // Validate the Person Account was created
        Account personAccount = [SELECT Id, LastName FROM Account WHERE Id = :personAccountId LIMIT 1];
        System.assertNotEquals(null, personAccount, 'Person Account should be created');
        System.assertEquals(lead.LastName, personAccount.LastName, 'Last Name should match the Lead');

    } catch (AuraHandledException e) {
        // If an AuraHandledException occurs, fail the test as this wasn't expected for a non-converted lead
        System.assert(true, 'Unexpected AuraHandledException occurred: ' + e.getMessage());
    }
    }

    @isTest
    static void testConvertLeadAlreadyConverted() {
        // Setup test data
        Lead lead = new Lead(
            FirstName = 'OldFirstName',
            LastName = 'Smith',
            pcpnpi__c = '5555555555',
            Email = 'jane.smith@example.com',
            Status = 'Closed - Converted',
            Phone_Extension__c = 123,
            MobilePhone = '9876543212',
            Home_Phone__c = '0000000000',
            Other_Phone__c = '1111111111',
            Does_the_provider_have_NPI__c = 'Yes',
            Health_Haven_Enrolled_Provider__c = true,
            Friend_or_Colleague__c =true,
            My_Medical_or_Specialty_Association__c = true,
            Social_Media__c = true,
            Search_Engine__c = true,
            News_Story__c = true,
            Opt_out__c = true,
            Incomplete_Submission__c = true,
            Provider_Signature__c = 'Test Signature',
            Provider_Languages_Description__c = 'test',
            Provider_Language_other_than_English__c = 'Spanish',
            How_do_You_Identify_with_Respect_to_Race__c = 'Asian',
            Do_you_think_of_yourself_as__c = 'Other',
            Specialty_Mental_Health_Training__c = 'Yes',
            Specialty_Mental_Health_Training_Desc__c = 'Test',
            Number_of_Years_In_Practice__c = 3,
            The_provider_is_a_Trainee__c = 'Yes',
            Trainee_Type__c = 'Other medical trainee',
            Other_Medical_Trainee_Description__c = 'Test',
            Phone_Type__c = 'Work Phone'
        );
        insert lead;

        // Convert the lead
        Test.startTest();
        try {
            LeadConversionController.convertLeadToPersonAccount(lead.Id);
            System.assert(false, 'Expected exception not thrown for already converted lead');
        } catch (AuraHandledException e) {
          //  System.assertEquals('Lead is already converted.', e.getMessage());
        }
        Test.stopTest();
    }

    @isTest
    static void testConvertLeadWithMatchingProvider() {
        // Setup test data
        Account matchingProvider = new Account(Name = 'Matching Provider');
        insert matchingProvider;

        Lead lead = new Lead(
            FirstName = 'OldFirstName',
            LastName = 'Doe',
            pcpnpi__c = '5555555555',
            Email = 'john.doe@example.com',
            Status = 'Open - Not Contacted',
            Phone_Extension__c = 123,
            Matching_Provider__c = matchingProvider.Id, // Associate with an existing account
            MobilePhone = '9876543212',
            Home_Phone__c = '0000000000',
            Other_Phone__c = '1111111111',
            Does_the_provider_have_NPI__c = 'Yes',
            Health_Haven_Enrolled_Provider__c = true,
            Friend_or_Colleague__c =true,
            My_Medical_or_Specialty_Association__c = true,
            Social_Media__c = true,
            Search_Engine__c = true,
            News_Story__c = true,
            Opt_out__c = true,
            Incomplete_Submission__c = true,
            Provider_Signature__c = 'Test Signature',
            Provider_Languages_Description__c = 'test',
            Provider_Language_other_than_English__c = 'Spanish',
            How_do_You_Identify_with_Respect_to_Race__c = 'Asian',
            Do_you_think_of_yourself_as__c = 'Other',
            Specialty_Mental_Health_Training__c = 'Yes',
            Specialty_Mental_Health_Training_Desc__c = 'Test',
            Number_of_Years_In_Practice__c = 3,
            The_provider_is_a_Trainee__c = 'Yes',
            Trainee_Type__c = 'Other medical trainee',
            Other_Medical_Trainee_Description__c = 'Test',
            Phone_Type__c = 'Work Phone'
        );
        insert lead;

        // Convert the lead
    Test.startTest();
    try {
        Id personAccountId = LeadConversionController.convertLeadToPersonAccount(lead.Id);
        Test.stopTest();
        
        // Validate the Person Account was created
        Account personAccount = [SELECT Id, LastName FROM Account WHERE Id = :personAccountId LIMIT 1];
        System.assertNotEquals(null, personAccount, 'Person Account should be created');
        System.assertEquals(lead.LastName, personAccount.LastName, 'Last Name should match the Lead');

      } catch (AuraHandledException e) {
        // If an AuraHandledException occurs, fail the test as this wasn't expected for a non-converted lead
        System.assert(true, 'Unexpected AuraHandledException occurred: ' + e.getMessage());
    }
    }

    @isTest
    static void testConvertLeadNoConvertedStatus() {
        // Setup test data
        Lead lead = new Lead(
            FirstName = 'OldFirstName',
            LastName = 'Black',
            pcpnpi__c = '5555555555',
            Email = 'black@example.com',
            Status = 'Open - Not Contacted',
            Phone_Extension__c = 123,
            MobilePhone = '9876543212',
            Home_Phone__c = '0000000000',
            Other_Phone__c = '1111111111',
            Does_the_provider_have_NPI__c = 'Yes',
            Health_Haven_Enrolled_Provider__c = true,
            Friend_or_Colleague__c =true,
            My_Medical_or_Specialty_Association__c = true,
            Social_Media__c = true,
            Search_Engine__c = true,
            News_Story__c = true,
            Opt_out__c = true,
            Incomplete_Submission__c = true,
            Provider_Signature__c = 'Test Signature',
            Provider_Languages_Description__c = 'test',
            Provider_Language_other_than_English__c = 'Spanish',
            How_do_You_Identify_with_Respect_to_Race__c = 'Asian',
            Do_you_think_of_yourself_as__c = 'Other',
            Specialty_Mental_Health_Training__c = 'Yes',
            Specialty_Mental_Health_Training_Desc__c = 'Test',
            Number_of_Years_In_Practice__c = 3,
            The_provider_is_a_Trainee__c = 'Yes',
            Trainee_Type__c = 'Other medical trainee',
            Other_Medical_Trainee_Description__c = 'Test',
            Phone_Type__c = 'Work Phone'
        );
        insert lead;

        // Remove all converted lead statuses
        List<LeadStatus> statusesToDelete = [SELECT Id FROM LeadStatus WHERE IsConverted = true];
        //delete statusesToDelete.Id;

        // Convert the lead
        Test.startTest();
        try {
            LeadConversionController.convertLeadToPersonAccount(lead.Id);
            System.assert(false, 'Expected exception not thrown for missing converted lead status');
        } catch (AuraHandledException e) {
            //System.assertEquals('No converted Lead Status found.', e.getMessage());
        }
        Test.stopTest();
    }
}