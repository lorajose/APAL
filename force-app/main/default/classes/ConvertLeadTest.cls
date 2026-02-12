@isTest
private class ConvertLeadTest {

    @isTest
    static void testConvertLead_withOpportunity() {

        Lead ld = new Lead(
            firstName = 'Marc',
            lastName = 'Benioff',
            company = 'Salesforce Time'
        );

        insert ld;

        Test.startTest();

        ConvertLead.LeadConvertRequest request = new ConvertLead.LeadConvertRequest();
        request.leadId = ld.id;
        request.convertedStatus = [ SELECT id, masterLabel FROM LeadStatus WHERE isConverted = true LIMIT 1 ].masterLabel;
        request.createOpportunity = true;
        request.opportunityName = 'Test Opportunity';
        request.ownerId = UserInfo.getUserId();
        request.sendEmailToOwner = true;

        List<ConvertLead.LeadConvertResult> results = ConvertLead.convertLead( new List<ConvertLead.LeadConvertRequest>{ request } );

        Test.stopTest();

        System.assert( results != null );
        System.assertEquals( 1, results.size() );

        ConvertLead.LeadConvertResult result = results[0];

        System.assertEquals( 1, [ SELECT count() FROM Account WHERE id = :result.accountId ] );
        System.assertEquals( 1, [ SELECT count() FROM Contact WHERE id = :result.contactId ] );
        System.assertEquals( 1, [ SELECT count() FROM Opportunity WHERE id = :result.opportunityId ] );

    }

    @isTest
    static void testConvertLead_withoutOpportunity() {

        Account acct = new Account(
            name = 'Salesforce Time'
        );

        insert acct;

        Contact cont = new Contact(
            accountId = acct.id,
            firstName = 'Marc',
            lastName = 'Benioff'
        );

        insert cont;

        Lead ld = new Lead(
            firstName = 'Marc',
            lastName = 'Benioff',
            company = 'Salesforce Time'
        );

        insert ld;

        Test.startTest();

        ConvertLead.LeadConvertRequest request = new ConvertLead.LeadConvertRequest();
        request.leadId = ld.id;
        request.convertedStatus = [ SELECT id, masterLabel FROM LeadStatus WHERE isConverted = true LIMIT 1 ].masterLabel;
        request.createOpportunity = false;
        request.accountId = acct.id;
        request.contactId = cont.id;
        request.overwriteLeadSource = true;

        List<ConvertLead.LeadConvertResult> results = ConvertLead.convertLead( new List<ConvertLead.LeadConvertRequest>{ request } );

        Test.stopTest();

        System.assert( results != null );
        System.assertEquals( 1, results.size() );

        ConvertLead.LeadConvertResult result = results[0];

        System.assertEquals( 1, [ SELECT count() FROM Account WHERE id = :result.accountId AND id = :acct.id ] );
        System.assertEquals( 1, [ SELECT count() FROM Contact WHERE id = :result.contactId AND id = :cont.id ] );
        System.assertEquals( 0, [ SELECT count() FROM Opportunity WHERE id = :result.opportunityId ] );

    }

}