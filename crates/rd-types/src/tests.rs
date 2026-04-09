#[cfg(test)]
mod tests {
    use crate::fragment::{Fragment, SourceMetadata, SourceType, FragmentStatus, DeclassifiedResult};
    use crate::confidence::ConfidenceScore;

    #[test]
    fn test_fragment_creation() {
        let content = "Test redacted content with ███ markers".to_string();
        let source = SourceMetadata {
            url_hash: "abc123".to_string(),
            source_type: SourceType::Text,
            redaction_zones: 3,
            coordinates: None,
            classification_level: None,
            source_timestamp: None,
        };

        let fragment = Fragment::new(content.clone(), source.clone());

        assert_eq!(fragment.redacted_content, content);
        assert_eq!(fragment.source.source_type, SourceType::Text);
        assert_eq!(fragment.source.redaction_zones, 3);
        assert_eq!(fragment.status, FragmentStatus::Pending);
        assert_eq!(fragment.attempts, 0);
        assert!(fragment.reconstruction.is_none());
        assert!(fragment.confidence.is_none());
    }

    #[test]
    fn test_fragment_hash_computation() {
        let content = "Test content";
        let hash1 = Fragment::compute_hash(content);
        let hash2 = Fragment::compute_hash(content);
        let hash3 = Fragment::compute_hash("Different content");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
        assert_eq!(hash1.len(), 64); // SHA256 hex length
    }

    #[test]
    fn test_fragment_state_transitions() {
        let content = "Test content".to_string();
        let source = SourceMetadata {
            url_hash: "abc123".to_string(),
            source_type: SourceType::Text,
            redaction_zones: 1,
            coordinates: None,
            classification_level: None,
            source_timestamp: None,
        };

        let mut fragment = Fragment::new(content, source);
        assert_eq!(fragment.status, FragmentStatus::Pending);

        // Mark processing
        fragment.mark_processing();
        assert_eq!(fragment.status, FragmentStatus::Processing);
        assert_eq!(fragment.attempts, 1);

        // Mark declassified
        let result = DeclassifiedResult {
            text: "Reconstructed text".to_string(),
            model: "test-model".to_string(),
            reconstruction_time_ms: 1500,
            reasoning_summary: "Test summary".to_string(),
        };
        let confidence = ConfidenceScore::compute(0.9, 0.85, 0.8, 0.75);
        fragment.mark_declassified(result, confidence);
        assert_eq!(fragment.status, FragmentStatus::Declassified);
        assert!(fragment.reconstruction.is_some());
        assert!(fragment.confidence.is_some());

        // Mark anchored
        fragment.mark_anchored("tx_signature".to_string(), "arweave_tx".to_string());
        assert_eq!(fragment.status, FragmentStatus::Anchored);
        assert_eq!(fragment.on_chain_tx, Some("tx_signature".to_string()));
        assert_eq!(fragment.arweave_tx, Some("arweave_tx".to_string()));
    }

    #[test]
    fn test_fragment_failed_status() {
        let content = "Test content".to_string();
        let source = SourceMetadata {
            url_hash: "abc123".to_string(),
            source_type: SourceType::Text,
            redaction_zones: 1,
            coordinates: None,
            classification_level: None,
            source_timestamp: None,
        };

        let mut fragment = Fragment::new(content, source);
        fragment.mark_failed("Test error".to_string());

        match &fragment.status {
            FragmentStatus::Failed { error } => assert_eq!(error, "Test error"),
            _ => panic!("Expected Failed status"),
        }
    }

    #[test]
    fn test_fragment_publication_readiness() {
        let content = "Test content".to_string();
        let source = SourceMetadata {
            url_hash: "abc123".to_string(),
            source_type: SourceType::Text,
            redaction_zones: 1,
            coordinates: None,
            classification_level: None,
            source_timestamp: None,
        };

        let mut fragment = Fragment::new(content, source);

        // Not ready when pending
        assert!(!fragment.is_ready_for_publication());

        // Mark declassified with high confidence
        let result = DeclassifiedResult {
            text: "Reconstructed".to_string(),
            model: "test".to_string(),
            reconstruction_time_ms: 1000,
            reasoning_summary: "Summary".to_string(),
        };
        let high_confidence = ConfidenceScore::compute(0.95, 0.9, 0.85, 0.8);
        fragment.mark_declassified(result.clone(), high_confidence);
        assert!(fragment.is_ready_for_publication());

        // Low confidence should not be ready
        let low_confidence = ConfidenceScore::compute(0.6, 0.5, 0.6, 0.5);
        fragment.mark_declassified(result, low_confidence);
        assert!(!fragment.is_ready_for_publication());
    }

    #[test]
    fn test_confidence_score_computation() {
        let score = ConfidenceScore::compute(0.9, 0.85, 0.8, 0.75);

        // Weighted: 0.9*0.4 + 0.85*0.3 + 0.8*0.2 + 0.75*0.1 = 0.36 + 0.255 + 0.16 + 0.075 = 0.85
        assert!((score.overall - 0.85).abs() < 0.01);
        assert!((score.model_confidence - 0.9).abs() < 0.01);
        assert!((score.cross_model_agreement - 0.85).abs() < 0.01);
        assert!((score.contextual_consistency - 0.8).abs() < 0.01);
        assert!((score.source_reliability - 0.75).abs() < 0.01);
    }

    #[test]
    fn test_confidence_score_clamping() {
        let score = ConfidenceScore::compute(1.5, 2.0, -0.5, 3.0);

        assert!((score.model_confidence - 1.0).abs() < 0.01);
        assert!((score.cross_model_agreement - 1.0).abs() < 0.01);
        assert!((score.contextual_consistency - 0.0).abs() < 0.01);
        assert!((score.source_reliability - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_confidence_score_threshold() {
        let high = ConfidenceScore::compute(0.95, 0.9, 0.85, 0.8);
        let low = ConfidenceScore::compute(0.6, 0.5, 0.6, 0.5);

        assert!(high.is_above_threshold(0.85));
        assert!(!low.is_above_threshold(0.85));
    }

    #[test]
    fn test_confidence_score_percentage() {
        let score = ConfidenceScore::compute(0.85, 0.8, 0.75, 0.7);
        // Weighted: 0.85*0.4 + 0.8*0.3 + 0.75*0.2 + 0.7*0.1 = 0.34 + 0.24 + 0.15 + 0.07 = 0.80
        assert_eq!(score.as_pct(), "80.0%");
    }

    #[test]
    fn test_confidence_score_status_label() {
        let verified = ConfidenceScore::compute(0.96, 0.95, 0.95, 0.95);
        let declassified = ConfidenceScore::compute(0.9, 0.85, 0.85, 0.85);
        let provisional = ConfidenceScore::compute(0.75, 0.7, 0.7, 0.7);
        let low = ConfidenceScore::compute(0.5, 0.5, 0.5, 0.5);

        assert_eq!(verified.status_label(), "VERIFIED");
        assert_eq!(declassified.status_label(), "DECLASSIFIED");
        assert_eq!(provisional.status_label(), "PROVISIONAL");
        assert_eq!(low.status_label(), "LOW CONFIDENCE");
    }

    use crate::permission::PermissionLevel;

    #[test]
    fn test_permission_level_display() {
        assert_eq!(format!("{}", PermissionLevel::Observer), "observer");
        assert_eq!(format!("{}", PermissionLevel::Reconstructor), "reconstructor");
        assert_eq!(format!("{}", PermissionLevel::Declassifier), "declassifier");
    }

    #[test]
    fn test_permission_level_allows() {
        // Observer allows only Observer
        assert!(PermissionLevel::Observer.allows(PermissionLevel::Observer));
        assert!(!PermissionLevel::Observer.allows(PermissionLevel::Reconstructor));
        assert!(!PermissionLevel::Observer.allows(PermissionLevel::Declassifier));

        // Reconstructor allows Observer and Reconstructor
        assert!(PermissionLevel::Reconstructor.allows(PermissionLevel::Observer));
        assert!(PermissionLevel::Reconstructor.allows(PermissionLevel::Reconstructor));
        assert!(!PermissionLevel::Reconstructor.allows(PermissionLevel::Declassifier));

        // Declassifier allows all
        assert!(PermissionLevel::Declassifier.allows(PermissionLevel::Observer));
        assert!(PermissionLevel::Declassifier.allows(PermissionLevel::Reconstructor));
        assert!(PermissionLevel::Declassifier.allows(PermissionLevel::Declassifier));
    }

    #[test]
    fn test_permission_level_parsing() {
        // Observer aliases
        assert_eq!(PermissionLevel::parse("observer"), Some(PermissionLevel::Observer));
        assert_eq!(PermissionLevel::parse("readonly"), Some(PermissionLevel::Observer));
        assert_eq!(PermissionLevel::parse("read_only"), Some(PermissionLevel::Observer));
        assert_eq!(PermissionLevel::parse("0"), Some(PermissionLevel::Observer));

        // Reconstructor aliases
        assert_eq!(PermissionLevel::parse("reconstructor"), Some(PermissionLevel::Reconstructor));
        assert_eq!(PermissionLevel::parse("write"), Some(PermissionLevel::Reconstructor));
        assert_eq!(PermissionLevel::parse("1"), Some(PermissionLevel::Reconstructor));

        // Declassifier aliases
        assert_eq!(PermissionLevel::parse("declassifier"), Some(PermissionLevel::Declassifier));
        assert_eq!(PermissionLevel::parse("full"), Some(PermissionLevel::Declassifier));
        assert_eq!(PermissionLevel::parse("2"), Some(PermissionLevel::Declassifier));

        // Invalid
        assert_eq!(PermissionLevel::parse("invalid"), None);
        assert_eq!(PermissionLevel::parse(""), None);
    }

    use crate::permission::PermissionContext;

    #[test]
    fn test_permission_context_blocking() {
        let ctx = PermissionContext::new()
            .deny_name("shell")
            .deny_prefix("dangerous_");

        assert!(ctx.blocks("shell"));
        assert!(ctx.blocks("SHELL")); // case insensitive
        assert!(ctx.blocks("dangerous_operation"));
        assert!(ctx.blocks("DANGEROUS_THING"));
        assert!(!ctx.blocks("read_file"));
        assert!(!ctx.blocks("safe_operation"));
    }

    #[test]
    fn test_permission_context_from_iterables() {
        let ctx = PermissionContext::from_iterables(
            vec!["shell".to_string(), "exec".to_string()],
            vec!["dangerous_".to_string()],
        );

        assert!(ctx.blocks("shell"));
        assert!(ctx.blocks("exec"));
        assert!(ctx.blocks("dangerous_thing"));
        assert!(!ctx.blocks("read_file"));
    }
}
