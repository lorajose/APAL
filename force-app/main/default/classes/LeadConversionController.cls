public with sharing  class LeadConversionController {
    @AuraEnabled
    public static Id convertLeadToPersonAccount(Id leadId) {
        try {                             
                // Retrieve lead fields
                Lead lead = [SELECT Conference_presentation_or_exhibit__c, Description, 
                             Do_you_think_of_yourself_as__c, Does_the_provider_have_NPI__c, 
                             Email, Friend_or_Colleague__c, Health_Haven_Enrolled_Provider__c, 
                             Health_Haven_staff__c, Home_Phone__c, 
                             How_do_You_Identify_with_Respect_to_Race__c, 
                             LastModifiedById, LeadSource, Status, Matching_Provider__c, 
                             MobilePhone, My_Medical_or_Specialty_Association__c, 
                             FirstName, LastName, News_Story__c, 
                             Number_of_Years_In_Practice__c, Opt_out__c, Other__c, 
                             Other_Medical_Trainee_Description__c, Other_Phone__c, 
                             Other_Specialty_Description__c, Phone, Phone_Extension__c, 
                             Phone_Type__c, Practice__c, Practice_APAL_Region__c, 
                             Provider_Language_other_than_English__c, 
                             Provider_Languages_Description__c, pcpnpi__c, 
                             Provider_Signature__c, Search_Engine__c, Social_Media__c, 
                             Specialty_Description__c, Specialty_Mental_Health_Training_Desc__c, 
                             Specialty_Mental_Health_Training__c, The_provider_is_a_Trainee__c, 
                             Trainee_Type__c, IsConverted, Type__c, pcpothersta_desc__c,heard_other__c,pcpracedesc__c,trainenddate__c,Provider_Registration_Status__c FROM Lead WHERE Id = :leadId LIMIT 1];

            
               if (lead.IsConverted) {
                throw new AuraHandledException('Lead is already converted.');
               }
            
            
            // Create the LeadConvert object
            Database.LeadConvert leadConvert = new Database.LeadConvert();
            leadConvert.setLeadId(leadId);
            
            // Set the converted status to a valid status (e.g., 'Closed - Converted')
            LeadStatus convertedStatus = [SELECT Id, MasterLabel FROM LeadStatus WHERE IsConverted = true LIMIT 1];
            leadConvert.setConvertedStatus(convertedStatus.MasterLabel);
            
             // Optional: Define if you'd like to create a new Account or use an existing one (from Matching_Provider__c)
            if (lead.Matching_Provider__c != null) {
                leadConvert.setAccountId(lead.Matching_Provider__c);
            }
            
           // Set options to convert the Lead to a Person Account and set DoNotCreateOpportunity to true if no Opportunity is required
            leadConvert.setDoNotCreateOpportunity(true);
            //leadConvert.setConvertedAccountId(lead.Matching_Provider__c);
            
            // Attempt lead conversion
            Database.LeadConvertResult conversionResult = Database.convertLead(leadConvert);
            
            if (conversionResult.isSuccess()) {
                // Get the converted Person Account Id
                Id personAccountId = conversionResult.getAccountId();
                
                Account personAccount = [SELECT Id, ConferencePresentation__c, Description, 
                                         pcpgender__c, pcphasnpi__c, PersonEmail, 
                                         FriendOrColleague__c, VMAPEnrolledProvider__c, 
                                         DirectContactWithVMAPstaff__c, PersonHomePhone, 
                                         provider_racee__c, LastModifiedById, PersonLeadSource, 
                                         Record_Status__pc, PersonMobilePhone, 
                                         MyMedicalOrSpecialtyAssociation__c, FirstName, 
                                         LastName, NewspaperNewsStory__c, pcpyrspract__c, 
                                         pcpinitials__c, OtherSource__c, pcptraintypedescrmd__c, 
                                         PersonOtherPhone, pcpmdtypedesc__c, Phone, 
                                         pcpphoneext__c, pcpphonedesc__c, practiceid__c, 
                                         Practice_VMAP_Region__c, pcplang__c, pcplangdesc__c, 
                                         pcpnpi__c, pcpesignature__c, SearchEngine__c, 
                                         OtherSocialMedia__c, pcpmdtype__c, pcpmhtraindesc__c, 
                                         pcpmhtrain__c, pcptrainee__c, pcptraintype__c, pcptitle__c, pcpothersta_desc__c,heard_other__c,pcpracedesc__c,trainenddate__c, Provider_Registration_Status__c   
                                         FROM Account 
                                         WHERE Id = :personAccountId LIMIT 1];
                             
                // Update the person account fields based on the lead information
                updatePersonAccountFields(lead, personAccount);
                return personAccountId; // Return the Person Account Id for navigation

            } else {
                throw new AuraHandledException('Lead conversion failed.');
            }

        } catch (Exception e) {
            throw new AuraHandledException('Error converting Lead: ' + e.getMessage());
        }
       }
    public static void updatePersonAccountFields(Lead lead, Account personAccount) {         
           // Field by field comparison step 1
            if (lead.FirstName != null && lead.FirstName != personAccount.FirstName)
            {personAccount.FirstName = lead.FirstName;}
            if (lead.LastName != null && lead.LastName != personAccount.LastName)
            {personAccount.LastName = lead.LastName;}
            if (lead.Does_the_provider_have_NPI__c != null && lead.Does_the_provider_have_NPI__c != personAccount.pcphasnpi__c)
            {personAccount.pcphasnpi__c = lead.Does_the_provider_have_NPI__c;}
            if (lead.pcpnpi__c != null && lead.pcpnpi__c != personAccount.pcpnpi__c)
            {personAccount.pcpnpi__c = lead.pcpnpi__c;}
            if (lead.LeadSource != null && lead.LeadSource != personAccount.PersonLeadSource)
            {personAccount.PersonLeadSource = lead.LeadSource;}
            if (lead.Provider_Registration_Status__c  != null && lead.Provider_Registration_Status__c  != personAccount.Provider_Registration_Status__c )
            {personAccount.Provider_Registration_Status__c  = lead.Provider_Registration_Status__c ;}

            if (lead.Email != null && lead.Email != personAccount.PersonEmail)
            {personAccount.PersonEmail = lead.Email;}
            if (lead.Phone != null && lead.Phone != personAccount.Phone)
            {personAccount.Phone = lead.Phone;}
            if (lead.Phone_Extension__c != null && lead.Phone_Extension__c != personAccount.pcpphoneext__c)
            {personAccount.pcpphoneext__c = lead.Phone_Extension__c;}
           
           // Field by field comparison step 2
            if (lead.Phone_Type__c != null && lead.Phone_Type__c != personAccount.pcpphonedesc__c )
            {personAccount.pcpphonedesc__c  = lead.Phone_Type__c;}
            if (lead.Home_Phone__c != null && lead.Home_Phone__c != personAccount.PersonHomePhone)
            {personAccount.PersonHomePhone = lead.Home_Phone__c;}
            if (lead.Other_Phone__c != null && lead.Other_Phone__c != personAccount.PersonOtherPhone)
            {personAccount.PersonOtherPhone = lead.Other_Phone__c;}
            if (lead.MobilePhone != null && lead.MobilePhone != personAccount.PersonMobilePhone)
            {personAccount.PersonMobilePhone = lead.MobilePhone;}
            /*if (lead.Practice__c != null && lead.Practice__c != personAccount.practiceid__c)
            {personAccount.practiceid__c = lead.Practice__c;}*/
            if (lead.pcpothersta_desc__c != null && lead.pcpothersta_desc__c != personAccount.pcpothersta_desc__c)
            {personAccount.pcpothersta_desc__c = lead.pcpothersta_desc__c;}
            if (lead.Type__c != null && lead.Type__c != personAccount.pcptitle__c)
            {personAccount.pcptitle__c = lead.Type__c;}
            if (lead.Specialty_Description__c != null && lead.Specialty_Description__c != personAccount.pcpmdtype__c )
            {personAccount.pcpmdtype__c  = lead.Specialty_Description__c;}
            if (lead.Other_Specialty_Description__c != null && lead.Other_Specialty_Description__c != personAccount.pcpmdtypedesc__c )
            {personAccount.pcpmdtypedesc__c  = lead.Other_Specialty_Description__c;}
           
           // // Field by field comparison step 3
           //System.debug('Afuera' + lead.Health_Haven_staff__c );
            if (lead.Health_Haven_staff__c != false && lead.Health_Haven_staff__c != null && lead.Health_Haven_staff__c != personAccount.DirectContactWithVMAPstaff__c)
            {
                //System.debug('Dentro' + lead.Health_Haven_staff__c );
                personAccount.DirectContactWithVMAPstaff__c = lead.Health_Haven_staff__c;
            }
            if (lead.Health_Haven_Enrolled_Provider__c != False && lead.Health_Haven_Enrolled_Provider__c != null && lead.Health_Haven_Enrolled_Provider__c != personAccount.VMAPEnrolledProvider__c)
            {personAccount.VMAPEnrolledProvider__c = lead.Health_Haven_Enrolled_Provider__c;}
            if (lead.Friend_or_Colleague__c != false && lead.Friend_or_Colleague__c != null && lead.Friend_or_Colleague__c != personAccount.FriendOrColleague__c)
            {personAccount.FriendOrColleague__c = lead.Friend_or_Colleague__c;}
            if (lead.My_Medical_or_Specialty_Association__c != false && lead.My_Medical_or_Specialty_Association__c != null && lead.My_Medical_or_Specialty_Association__c != personAccount.MyMedicalOrSpecialtyAssociation__c)
            {personAccount.MyMedicalOrSpecialtyAssociation__c = lead.My_Medical_or_Specialty_Association__c;}
            if (lead.Social_Media__c != false && lead.Social_Media__c != null && lead.Social_Media__c != personAccount.OtherSocialMedia__c )
            {personAccount.OtherSocialMedia__c  = lead.Social_Media__c; }
            if (lead.Search_Engine__c != false && lead.Search_Engine__c != null && lead.Search_Engine__c != personAccount.SearchEngine__c)
            {personAccount.SearchEngine__c = lead.Search_Engine__c;}
            if (lead.News_Story__c != false && lead.News_Story__c != null && lead.News_Story__c != personAccount.NewspaperNewsStory__c )
            {personAccount.NewspaperNewsStory__c  = lead.News_Story__c;}
            if (lead.Conference_presentation_or_exhibit__c != false && lead.Conference_presentation_or_exhibit__c != null && lead.Conference_presentation_or_exhibit__c != personAccount.ConferencePresentation__c)
            {personAccount.ConferencePresentation__c = lead.Conference_presentation_or_exhibit__c;}
            if (lead.Other__c != false && lead.Other__c != null && lead.Other__c != personAccount.OtherSource__c )
            {personAccount.OtherSource__c  = lead.Other__c;}
            
           // Field by field comparison step 4
            if (lead.Number_of_Years_In_Practice__c != null && lead.Number_of_Years_In_Practice__c != personAccount.pcpyrspract__c )
            {personAccount.pcpyrspract__c  = lead.Number_of_Years_In_Practice__c;}
            if (lead.The_provider_is_a_Trainee__c != null && lead.The_provider_is_a_Trainee__c != personAccount.pcptrainee__c )
            {personAccount.pcptrainee__c  = lead.The_provider_is_a_Trainee__c;}
            if (lead.Trainee_Type__c != null && lead.Trainee_Type__c != personAccount.pcptraintype__c )
            {personAccount.pcptraintype__c  = lead.Trainee_Type__c;}
            if (lead.Other_Medical_Trainee_Description__c != null && lead.Other_Medical_Trainee_Description__c != personAccount.pcptraintypedescrmd__c )
            {personAccount.pcptraintypedescrmd__c  = lead.Other_Medical_Trainee_Description__c;}
            if (lead.Name_of_School__c != null && personAccount.get('Name_of_School__c') != lead.Name_of_School__c) {
                personAccount.put('Name_of_School__c', lead.Name_of_School__c);
            }
            if (lead.Specialty_Mental_Health_Training_Desc__c != null && lead.Specialty_Mental_Health_Training_Desc__c != personAccount.pcpmhtraindesc__c )
            {personAccount.pcpmhtraindesc__c  = lead.Specialty_Mental_Health_Training_Desc__c;}
            if (lead.Specialty_Mental_Health_Training__c != null && lead.Specialty_Mental_Health_Training__c != personAccount.pcpmhtrain__c )
            {personAccount.pcpmhtrain__c  = lead.Specialty_Mental_Health_Training__c;}
          //if (lead.Practice_APAL_Region__c != null && lead.Practice_APAL_Region__c != personAccount.Practice_VMAP_Region__c)
          //{personAccount.Practice_VMAP_Region__c = lead.Practice_APAL_Region__c;}

           // Field by field comparison step 5
            if (lead.Do_you_think_of_yourself_as__c != null && lead.Do_you_think_of_yourself_as__c != personAccount.pcpgender__c)
            {personAccount.pcpgender__c = lead.Do_you_think_of_yourself_as__c;}
            if (lead.How_do_You_Identify_with_Respect_to_Race__c != null && lead.How_do_You_Identify_with_Respect_to_Race__c != personAccount.provider_racee__c)
            {personAccount.provider_racee__c = lead.How_do_You_Identify_with_Respect_to_Race__c;}
            if (lead.Provider_Language_other_than_English__c != null && lead.Provider_Language_other_than_English__c != personAccount.pcplang__c )
            {personAccount.pcplang__c  = lead.Provider_Language_other_than_English__c;}
            if (lead.Provider_Languages_Description__c != null && lead.Provider_Languages_Description__c != personAccount.pcplangdesc__c)
            {personAccount.pcplangdesc__c = lead.Provider_Languages_Description__c;}
        
           // Field by field comparison step 6
            if (lead.Opt_out__c != false && lead.Opt_out__c != null && lead.Opt_out__c != personAccount.pcpinitials__c )
            {personAccount.pcpinitials__c  = lead.Opt_out__c;}
            if (lead.Provider_Signature__c != null && lead.Provider_Signature__c != personAccount.pcpesignature__c)
            {personAccount.pcpesignature__c = lead.Provider_Signature__c;}  
            if (lead.Description != null && lead.Description != personAccount.Description)
                personAccount.Description = lead.Description;
            //Last Add
            if (lead.Health_Haven_Enrolled_Provider__c != null && personAccount.get('VMAPEnrolledProvider__c') != lead.Health_Haven_Enrolled_Provider__c) {
                personAccount.put('VMAPEnrolledProvider__c', lead.Health_Haven_Enrolled_Provider__c);
            }
            if (lead.heard_other__c != null && lead.heard_other__c != personAccount.heard_other__c)
            {personAccount.heard_other__c = lead.heard_other__c;}
            if (lead.pcpracedesc__c != null && lead.pcpracedesc__c != personAccount.pcpracedesc__c)
            {personAccount.pcpracedesc__c = lead.pcpracedesc__c;}
            if (lead.trainenddate__c != null && lead.trainenddate__c != personAccount.trainenddate__c)
            {personAccount.trainenddate__c = lead.trainenddate__c;}


            //if (lead.Status != null && lead.Status != personAccount.Record_Status__pc )
            //    personAccount.Record_Status__pc  = 'Complete'; //lead.Status;

          update personAccount; // Update the Person Account after the field comparisons
           lead.Status = 'Closed - Converted';
           //lead.IsConverted = true;  
           
         update lead;   
        }
    }