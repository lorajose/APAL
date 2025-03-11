/**
 * @author Artem Shevchenko
 * @date 03.06.2025
 *
 * @description Selector class for querying User records based on different WHERE clauses.
 */

public with sharing class UserSelector {

    /**
     * @description Retrieves User record by it's Id.
     * @param userId User Id to query.
     * @return a User record.
     */
    public User queryById(Id userId) {
        if (String.isBlank(userId)) {
            return null;
        }

        List<User> userRecord = [
                SELECT
                        Id
                        , Name
                FROM User
                WHERE Id = :userId
        ];

        return userRecord.isEmpty() ? null : userRecord[0];
    }
}