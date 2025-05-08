public with sharing class ConvertLead {


    public class LeadConvertRequest {

        @InvocableVariable(
            label = 'Lead ID'
            description = 'ID of the Lead record.'
            required = true
        )
        public ID leadId;

        @InvocableVariable(
            label = 'Converted Status'
            description = 'Converted Lead Status picklist value.'
            required = true
        )
        public String convertedStatus;

        @InvocableVariable(
            label = 'Account ID'
            description = 'ID of the Account to convert Lead into. Leave it blank to create a new Account.'
        )
        public ID accountId;

        @InvocableVariable(
            label = 'Contact ID'
            description = 'ID of the Contact to convert Lead into. Leave it blank to create a new Contact.'
        )
        public ID contactId;

        @InvocableVariable(
            label = 'Overwrite Lead Source'
            description = 'Overwrite the LeadSource field on the target Contact with the LeadSource field from the Lead. Default is false. If true, then you must also specify Contact ID.'
        )
        public Boolean overwriteLeadSource = false;

        @InvocableVariable(
            label = 'Create Opportunity'
            description = 'Default is true.'
        )
        public Boolean createOpportunity = true;

        @InvocableVariable(
            label = 'Opportunity Name'
            description = 'If Create Opportunity is true, then this will be the name of the new opportunity. If you leave it blank, then it defaults to Company field from the Lead.'
        )
        public String opportunityName;

        @InvocableVariable(
            label = 'Owner ID'
            description = 'ID of the user to own the new Account, Contact, and Opportunity records created. Default is the Lead owner.'
        )
        public ID ownerId;

        @InvocableVariable(
            label = 'Send Email to Owner'
            description = 'Send an email to owner specified in Owner ID. Default is false.'
        )
        public Boolean sendEmailToOwner = false;

    }

    
    public class LeadConvertResult {

        @InvocableVariable( label = 'Lead ID' )
        public ID leadId;

        @InvocableVariable( label = 'Account ID' )
        public ID accountId;

        @InvocableVariable( label = 'Contact ID' )
        public ID contactId;

        @InvocableVariable( label = 'Opportunity ID' )
        public ID opportunityId;

    }


    @InvocableMethod(
        label = 'Convert Lead'
        iconName = 'slds:standard:customer_360'
    )
    public static List<LeadConvertResult> convertLead( List<LeadConvertRequest> requests ) {

        // transform the invocable request to database convert request
        List<Database.LeadConvert> convertRequests = new List<Database.LeadConvert>();
        for ( LeadConvertRequest request : requests ) {
            convertRequests.add( transform( request ) );
        }

        List<Database.LeadConvertResult> convertResults = Database.convertLead( convertRequests, true );

        List<LeadConvertResult> results = new List<LeadConvertResult>();
        for ( Database.LeadConvertResult convertResult : convertResults ) {
            results.add( transform( convertResult ) );
        }

        return results;
    }


    private static Database.LeadConvert transform( LeadConvertRequest request ) {

        Database.LeadConvert convertRequest = new Database.LeadConvert();

        convertRequest.setLeadId( request.leadId );
        convertRequest.setConvertedStatus( request.convertedStatus );

        if ( request.accountId != null ) {
            convertRequest.setAccountId( request.accountId );
        }

        if ( request.contactId != null ) {
            convertRequest.setContactId( request.contactId );
        }

        if ( request.overwriteLeadSource != null && request.overwriteLeadSource ) {
            convertRequest.setOverwriteLeadSource( request.overwriteLeadSource );
        }

        if ( request.createOpportunity != null && !request.createOpportunity ) {
            convertRequest.setDoNotCreateOpportunity( !request.createOpportunity );
        }

        if ( request.opportunityName != null ) {
            convertRequest.setOpportunityName( request.opportunityName );
        }

        if ( request.ownerId != null ) {
            convertRequest.setOwnerId( request.ownerId );
        }

        if ( request.sendEmailToOwner != null && request.sendEmailToOwner ) {
            convertRequest.setSendNotificationEmail( request.sendEmailToOwner );
        }

        return convertRequest;
    }

    private static LeadConvertResult transform( Database.LeadConvertResult convertResult ) {

        LeadConvertResult result = new LeadConvertResult();

        result.leadId = convertResult.getLeadId();
        result.accountId = convertResult.getAccountId();
        result.contactId = convertResult.getContactId();
        result.opportunityId = convertResult.getOpportunityId();

        return result;
    }

    public class ConvertLeadException extends Exception {}

}