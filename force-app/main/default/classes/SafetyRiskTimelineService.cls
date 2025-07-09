@SuppressWarnings('PMD.AvoidGlobalModifier')
global with sharing class SafetyRiskTimelineService extends timeline.AbstractTimelineDataProvider {

    /**
     * @description The child object name
     * @return  String
     */
    global override String getObjectName() {
        return 'Patient_Safety_Risk__c';
    }

    /**
     * @description The label of the relationship name of the child object
     * @return  String
     */
    global override String getRelationshipName() {
        // Specify the relationship name if it exists or return a placeholder
        return 'SafetyRisks__r';
    }

    /**
     * @description The field that is used as the title (flow step: Title field)
     * @return  String
     */
    global override String getTitleField() {
        return 'Safety_RiskName__c';
    }

    /**
     * @description The field that is used as reference date (flow step: Date field)
     * @return  String
     */
    global override String getDateField() {
        return 'CreatedDate';
    }

    /**
     * @description The fields that are shown when expanded (flow step: Display fields)
     * @return  List<String>
     */
    global override List<String> getFieldsToDisplay() {
        return new List<String>{
            'Name',
            'Safety_RiskName__c',    
            'Safety_Risk__c',
            'Notes_new__c',
            'Historical__c',
            'Recent__c',
            'CreatedDate'
        };
    }

    /**
     * @description Defines the label and the type of the fields to display
     *              Only needed when it's not a Salesforce object
     * @return  List<timeline.TimelineFieldType>
     */
    global override List<timeline.TimelineFieldType> getFieldsToDisplayWithTypes() {
        List<timeline.TimelineFieldType> fieldTypes = new List<timeline.TimelineFieldType>();

        fieldTypes.add(timeline.TimelineFieldType.newInstance('Name', 'Name', Schema.DisplayType.STRING));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Safety Risk', 'Safety_RiskName__c', Schema.DisplayType.STRING));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Safety Risk', 'Safety_Risk__c', Schema.DisplayType.STRING));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Notes', 'Notes_new__c', Schema.DisplayType.TEXTAREA));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Historical', 'Historical__c', Schema.DisplayType.BOOLEAN));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Recent', 'Recent__c', Schema.DisplayType.BOOLEAN));
        fieldTypes.add(timeline.TimelineFieldType.newInstance('Created Date', 'CreatedDate', Schema.DisplayType.DATETIME));

        return fieldTypes;
    }

    /**
     * @description To put in another base URL than the current Salesforce instance
     * @return  String
     */
    global override String getBaseUrlForRecordDetail() {
        return '';
    }

    /**
     * @description The field that represents the record Id
     * @return  String
     */
    global override String getRecordIdentifierField() {
        return 'Id';
    }

    /**
     * @description This method returns the set of data
     * @param   recordId    The id of the parent record (in this case a Case Id)
     * @param   dateFilter  The dateFilter coming from the filters in the panel
     * @return  List<Object>
     */
    @SuppressWarnings('PMD.ApexSOQLInjection')
    global override List<Object> getData(Id recordId, String dateFilter) {
        List<Object> result = new List<Object>();
        if (Schema.sObjectType.Patient_Safety_Risk__c.isAccessible()) {
            String dateFilterStr;
            if(dateFilter != null) {
                switch on dateFilter {
                    when 'last_7_days' {
                        dateFilterStr = 'LAST_N_DAYS:7';
                    }
                    when 'last_30_days' { 
                        dateFilterStr = 'LAST_N_DAYS:30';
                    }
                    when 'next_7_days' {
                        dateFilterStr = 'NEXT_N_DAYS:7';
                    }
                }
            }
            // Retrieve the parent case ID from the subcase
            Case subCase = [SELECT ParentId FROM Case WHERE Id = :recordId LIMIT 1];
            Id parentCaseId = subCase.ParentId;

            // Build the query
            String query = 'SELECT Id, Name,Safety_RiskName__c, Safety_Risk__c, Notes_new__c, Historical__c, Recent__c, CreatedDate';
            query += ' FROM Patient_Safety_Risk__c';
            query += ' WHERE Case__c = \''+String.escapeSingleQuotes(parentCaseId)+'\'';
            if (dateFilterStr != null) {
                query +=' AND CreatedDate = '+dateFilterStr;
            }
            query += ' ORDER BY ' + this.getDateField() + ' DESC';
            
            // Execute the query and process the results
            for (Patient_Safety_Risk__c item : Database.query(query)) {
                Map<String,Object> obj = new Map<String,Object>();
                obj.put('Id', item.Id);
                obj.put('Name', item.Name);
                obj.put('Safety_RiskName__c', item.Safety_RiskName__c);
                obj.put('Safety_Risk__c', item.Safety_Risk__c);
                obj.put('Notes_new__c', item.Notes_new__c);
                obj.put('Historical__c', item.Historical__c);
                obj.put('Recent__c', item.Recent__c);
                obj.put('CreatedDate', item.CreatedDate);
                result.add(obj);
            }
        }
        return result;
    }

    /**
     * @description Returns if the child object is a Salesforce object
     * @return  Boolean
     */
    global override Boolean isSalesforceObject() {
        return true;
    }

    /**
     * @description Returns if UI API is not supported (like with Task)
     * @return  Boolean
     */
    global override Boolean isUiApiNotSupported() {
        return true;
    }
}