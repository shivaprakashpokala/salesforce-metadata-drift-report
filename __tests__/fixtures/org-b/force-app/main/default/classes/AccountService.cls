public class AccountService {
    public static void updateIndustry(Account acc, String industry) {
        acc.Industry__c = industry;
        acc.Revenue__c = 0;
        update acc;
    }

    public static List<Account> findByIndustry(String industry) {
        return [SELECT Id, Name, Industry__c FROM Account WHERE Industry__c = :industry];
    }
}
