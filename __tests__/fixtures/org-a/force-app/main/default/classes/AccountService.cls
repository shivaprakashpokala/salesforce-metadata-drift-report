public class AccountService {
    public static void updateIndustry(Account acc, String industry) {
        acc.Industry__c = industry;
        update acc;
    }
}
