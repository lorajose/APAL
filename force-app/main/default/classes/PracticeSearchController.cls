public with sharing class PracticeSearchController {
    @AuraEnabled(cacheable=true)
    public static List<Account> searchPractices(String searchKey) {
        return [
            SELECT Id, Name
            FROM Account
            WHERE RecordType.DeveloperName = 'Practice'
            AND Name LIKE :('%' + searchKey + '%')
            LIMIT 10
        ];
    }

    @AuraEnabled(cacheable=true)
    public static String getPracticeRecordTypeId() {
        RecordType rt = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND DeveloperName = 'Practice'
            LIMIT 1
        ];
        return rt.Id;
    }

    // 🧠 Nuevo método para detectar el último Practice creado por el usuario actual
    @AuraEnabled(cacheable=false)
    public static Account getLastCreatedPractice() {
        List<Account> recs = [
            SELECT Id, Name
            FROM Account
            WHERE RecordType.DeveloperName = 'Practice'
            AND CreatedById = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return recs.isEmpty() ? null : recs[0];
    }
    @AuraEnabled(cacheable=true)
public static Account getPracticeById(Id practiceId) {
    return [
        SELECT Id, Name, RecordTypeId, CreatedDate
        FROM Account
        WHERE Id = :practiceId
        LIMIT 1
    ];
}

}