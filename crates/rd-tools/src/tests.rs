#[cfg(test)]
mod tests {
    use crate::airdrop::{AirdropRegistry, AirdropSource};
    use crate::token_config;

    #[test]
    fn test_airdrop_registry_new() {
        let registry = AirdropRegistry::new_in_memory();
        let stats = registry.stats();

        assert_eq!(stats.total_recipients, 0);
        assert_eq!(stats.total_allocated, 0);
        assert_eq!(stats.total_claimed, 0);
        assert_eq!(stats.unclaimed, 0);
    }

    #[test]
    fn test_airdrop_register_telegram_user() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(123456789, "testuser");

        assert!(registry.is_eligible(123456789));
        assert!(!registry.is_eligible(987654321));
        assert_eq!(registry.get_amount(123456789), token_config::airdrop::TELEGRAM_USER_AMOUNT);
    }

    #[test]
    fn test_airdrop_duplicate_registration() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(123456789, "testuser");
        registry.register_telegram_user(123456789, "testuser2");

        // Should still have only one registration with original amount
        assert_eq!(registry.get_amount(123456789), token_config::airdrop::TELEGRAM_USER_AMOUNT);
        let stats = registry.stats();
        assert_eq!(stats.total_recipients, 1);
    }

    #[test]
    fn test_airdrop_reward_submission() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(123456789, "testuser");
        let initial_amount = registry.get_amount(123456789);

        registry.reward_submission(123456789, "testuser");
        let new_amount = registry.get_amount(123456789);

        assert_eq!(new_amount, initial_amount + token_config::airdrop::DOCUMENT_SUBMIT_REWARD);
    }

    #[test]
    fn test_airdrop_reward_verification() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(123456789, "testuser");
        let initial_amount = registry.get_amount(123456789);

        registry.reward_verification(123456789, "testuser");
        let new_amount = registry.get_amount(123456789);

        assert_eq!(new_amount, initial_amount + token_config::airdrop::FRAGMENT_VERIFY_REWARD);
    }

    #[test]
    fn test_airdrop_reward_without_prior_registration() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.reward_submission(123456789, "testuser");

        assert!(registry.is_eligible(123456789));
        assert_eq!(registry.get_amount(123456789), token_config::airdrop::DOCUMENT_SUBMIT_REWARD);
    }

    #[test]
    fn test_airdrop_connect_wallet() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(123456789, "testuser");

        // Initially no wallet
        let recipients: Vec<_> = registry.all_recipients();
        assert!(recipients[0].solana_wallet.is_none());

        // Connect wallet
        registry.connect_wallet(123456789, "5KJp...wallet");
        let recipient = registry.get_by_telegram(123456789).unwrap();
        assert_eq!(recipient.solana_wallet, Some("5KJp...wallet".to_string()));
    }

    #[test]
    fn test_airdrop_multiple_users() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(111, "user1");
        registry.register_telegram_user(222, "user2");
        registry.register_telegram_user(333, "user3");

        assert_eq!(registry.stats().total_recipients, 3);
        assert!(registry.is_eligible(111));
        assert!(registry.is_eligible(222));
        assert!(registry.is_eligible(333));
    }

    #[test]
    fn test_airdrop_total_allocated() {
        let mut registry = AirdropRegistry::new_in_memory();
        registry.register_telegram_user(111, "user1");
        registry.register_telegram_user(222, "user2");

        let expected = token_config::airdrop::TELEGRAM_USER_AMOUNT as u128 * 2;
        assert_eq!(registry.total_allocated(), expected);
    }

    #[test]
    fn test_airdrop_recipient_sources() {
        let mut registry = AirdropRegistry::new_in_memory();

        // Telegram user
        registry.register_telegram_user(111, "user1");
        let recipients: Vec<_> = registry.all_recipients();
        let user1 = recipients.iter().find(|r| r.telegram_user_id == 111).unwrap();
        assert!(matches!(user1.source, AirdropSource::TelegramUser));

        // Document submitter
        registry.reward_submission(222, "user2");
        let recipients: Vec<_> = registry.all_recipients();
        let user2 = recipients.iter().find(|r| r.telegram_user_id == 222).unwrap();
        assert!(matches!(user2.source, AirdropSource::DocumentSubmitter));

        // Fragment verifier
        registry.reward_verification(333, "user3");
        let recipients: Vec<_> = registry.all_recipients();
        let user3 = recipients.iter().find(|r| r.telegram_user_id == 333).unwrap();
        assert!(matches!(user3.source, AirdropSource::FragmentVerifier));
    }

    #[test]
    fn test_token_config_constants() {
        // Verify token supply
        assert_eq!(token_config::DECIMALS, 9);
        assert_eq!(token_config::TOTAL_SUPPLY, 1_000_000_000_000_000_000);

        // Verify distribution adds up to 10000 (100%)
        let total_bps = token_config::distribution::COMMUNITY_AIRDROP
            + token_config::distribution::LIQUIDITY_POOL
            + token_config::distribution::STAKING_REWARDS
            + token_config::distribution::ECOSYSTEM_DEV
            + token_config::distribution::TEAM_VESTED
            + token_config::distribution::TREASURY_DAO;
        assert_eq!(total_bps, 10000);

        // Verify amounts
        assert_eq!(token_config::amounts::community(), 350_000_000_000_000_000); // 35%
        assert_eq!(token_config::amounts::liquidity(), 200_000_000_000_000_000); // 20%
        assert_eq!(token_config::amounts::staking(), 200_000_000_000_000_000); // 20%
        assert_eq!(token_config::amounts::ecosystem(), 100_000_000_000_000_000); // 10%
        assert_eq!(token_config::amounts::team(), 100_000_000_000_000_000); // 10%
        assert_eq!(token_config::amounts::treasury(), 50_000_000_000_000_000); // 5%

        // Total should equal TOTAL_SUPPLY
        let total = token_config::amounts::community()
            + token_config::amounts::liquidity()
            + token_config::amounts::staking()
            + token_config::amounts::ecosystem()
            + token_config::amounts::team()
            + token_config::amounts::treasury();
        assert_eq!(total, token_config::TOTAL_SUPPLY);

        // Verify distribution check
        assert!(token_config::amounts::verify_distribution());
    }

    #[test]
    fn test_token_config_fees() {
        assert_eq!(token_config::fees::PROCESS_FEE, 100_000_000); // 0.1 RDX
        assert_eq!(token_config::fees::STAKERS_PCT, 70);
        assert_eq!(token_config::fees::TREASURY_PCT, 20);
        assert_eq!(token_config::fees::BURN_PCT, 10);

        // Percentages should add to 100
        assert_eq!(token_config::fees::STAKERS_PCT + token_config::fees::TREASURY_PCT + token_config::fees::BURN_PCT, 100);
    }

    #[test]
    fn test_token_config_staking_params() {
        assert_eq!(token_config::staking::MIN_STAKE, 100_000_000_000); // 100 RDX (increased)
        assert_eq!(token_config::staking::UNLOCK_PERIOD_SECS, 14 * 24 * 3600); // 14 days
        assert_eq!(token_config::staking::APY_BPS, 4000); // 40% APY (sustainable)
        assert_eq!(token_config::staking::LONG_TERM_BONUS_BPS, 1000); // +10% >90d
        assert_eq!(token_config::staking::LONG_TERM_THRESHOLD_SECS, 90 * 24 * 3600);
        assert_eq!(token_config::staking::EARLY_PENALTY_BPS, 1500); // 15%
        assert_eq!(token_config::staking::MAX_EPOCH_DRAWDOWN_PCT, 5);
    }

    #[test]
    fn test_token_config_airdrop_amounts() {
        assert_eq!(token_config::airdrop::TELEGRAM_USER_AMOUNT, 500_000_000_000); // 500 RDX (sybil-resistant)
        assert_eq!(token_config::airdrop::WALLET_CONNECT_BONUS, 200_000_000_000); // 200 RDX
        assert_eq!(token_config::airdrop::DOCUMENT_SUBMIT_REWARD, 100_000_000_000); // 100 RDX
        assert_eq!(token_config::airdrop::FRAGMENT_VERIFY_REWARD, 50_000_000_000); // 50 RDX
        assert_eq!(token_config::airdrop::FRAGMENT_PUBLISH_REWARD, 25_000_000_000); // 25 RDX
        assert_eq!(token_config::airdrop::REFERRAL_REWARD, 50_000_000_000); // 50 RDX
        assert_eq!(token_config::airdrop::MAX_PER_USER_CAP, 50_000_000_000_000); // 50K cap
    }

    #[test]
    fn test_token_config_burn_mechanics() {
        assert_eq!(token_config::burn::FEE_BURN_PCT, 10);
        assert!(token_config::burn::QUARTERLY_BURN_ENABLED);
        assert_eq!(token_config::burn::QUARTERLY_BUYBACK_MIN, 10_000_000_000_000); // 10K RDX
        assert_eq!(token_config::burn::MAX_BURN_PER_TX, 1_000_000_000_000); // 1K RDX
        assert_eq!(token_config::burn::BURN_ADDRESS, "1nc1nerator11111111111111111111111111111111");
    }
}
