#[cfg(test)]
mod tests {
    use crate::turn_summary::{TurnSummary, ToolResultEntry, StopCause};
    use rd_types::{block::ContentBlock, event::TokenUsage};

    #[test]
    fn test_turn_summary_complete() {
        let blocks = vec![ContentBlock::Text { text: "Test response".to_string() }];
        let results = vec![ToolResultEntry {
            tool_name: "test_tool".to_string(),
            output: "Test output".to_string(),
            is_error: false,
            hook_feedback: None,
        }];
        let usage = TokenUsage { input_tokens: 100, output_tokens: 50 };

        let summary = TurnSummary::complete(blocks, results, 2, usage.clone());

        assert!(summary.completed);
        assert_eq!(summary.iterations, 2);
        assert_eq!(summary.stop_reason, StopCause::Complete);
        assert_eq!(summary.assistant_blocks.len(), 1);
        assert_eq!(summary.tool_results.len(), 1);
        assert_eq!(summary.turn_usage.input_tokens, 100);
        assert_eq!(summary.turn_usage.output_tokens, 50);
        assert_eq!(summary.turn_usage.total(), 150);
    }

    #[test]
    fn test_turn_summary_stopped_max_iterations() {
        let blocks = vec![];
        let results = vec![];
        let usage = TokenUsage { input_tokens: 500, output_tokens: 200 };

        let summary = TurnSummary::stopped(
            blocks,
            results,
            10,
            usage,
            StopCause::MaxIterations,
        );

        assert!(!summary.completed);
        assert_eq!(summary.iterations, 10);
        assert_eq!(summary.stop_reason, StopCause::MaxIterations);
    }

    #[test]
    fn test_turn_summary_stopped_permission_denied() {
        let blocks = vec![];
        let results = vec![];
        let usage = TokenUsage { input_tokens: 50, output_tokens: 20 };

        let summary = TurnSummary::stopped(
            blocks,
            results,
            1,
            usage,
            StopCause::PermissionDenied { tool_name: "shell".to_string() },
        );

        assert!(!summary.completed);
        match &summary.stop_reason {
            StopCause::PermissionDenied { tool_name } => assert_eq!(tool_name, "shell"),
            _ => panic!("Expected PermissionDenied stop cause"),
        }
    }

    #[test]
    fn test_turn_summary_stopped_hook_denied() {
        let blocks = vec![];
        let results = vec![];
        let usage = TokenUsage { input_tokens: 100, output_tokens: 50 };

        let summary = TurnSummary::stopped(
            blocks,
            results,
            3,
            usage,
            StopCause::HookDenied {
                tool_name: "write_file".to_string(),
                reason: "Hook policy violation".to_string(),
            },
        );

        assert!(!summary.completed);
        match &summary.stop_reason {
            StopCause::HookDenied { tool_name, reason } => {
                assert_eq!(tool_name, "write_file");
                assert_eq!(reason, "Hook policy violation");
            }
            _ => panic!("Expected HookDenied stop cause"),
        }
    }

    #[test]
    fn test_turn_summary_stopped_provider_error() {
        let blocks = vec![];
        let results = vec![];
        let usage = TokenUsage { input_tokens: 0, output_tokens: 0 };

        let summary = TurnSummary::stopped(
            blocks,
            results,
            1,
            usage,
            StopCause::ProviderError { message: "API timeout".to_string() },
        );

        assert!(!summary.completed);
        match &summary.stop_reason {
            StopCause::ProviderError { message } => assert_eq!(message, "API timeout"),
            _ => panic!("Expected ProviderError stop cause"),
        }
    }

    #[test]
    fn test_turn_summary_stopped_tool_failure() {
        let blocks = vec![];
        let results = vec![ToolResultEntry {
            tool_name: "shell".to_string(),
            output: "ERROR: command failed".to_string(),
            is_error: true,
            hook_feedback: None,
        }];
        let usage = TokenUsage { input_tokens: 100, output_tokens: 50 };

        let summary = TurnSummary::stopped(
            blocks,
            results,
            2,
            usage,
            StopCause::ToolFailed {
                tool_name: "shell".to_string(),
                error: "command failed".to_string(),
            },
        );

        assert!(!summary.completed);
        match &summary.stop_reason {
            StopCause::ToolFailed { tool_name, error } => {
                assert_eq!(tool_name, "shell");
                assert_eq!(error, "command failed");
            }
            _ => panic!("Expected ToolFailed stop cause"),
        }
    }

    use crate::permission_checker::{PermissionChecker, PermissionDecision};
    use rd_types::permission::{PermissionContext, PermissionLevel};
    use rd_tools::{ToolRegistry, builtins::register_builtins};

    #[test]
    fn test_permission_checker_allows_within_level() {
        let mut registry = ToolRegistry::new();
        register_builtins(&mut registry);

        // Observer level should allow read-only tools
        let checker = PermissionChecker::new(
            PermissionLevel::Observer,
            PermissionContext::default(),
        );

        // read_file should be allowed at Observer level
        let decision = checker.authorize("read_file", &registry);
        assert_eq!(decision, PermissionDecision::Allow);
    }

    #[test]
    fn test_permission_checker_denies_higher_level_tools() {
        let mut registry = ToolRegistry::new();
        register_builtins(&mut registry);

        // Observer level should not allow write operations
        let checker = PermissionChecker::new(
            PermissionLevel::Observer,
            PermissionContext::default(),
        );

        // write_file requires at least Reconstructor
        let decision = checker.authorize("write_file", &registry);
        match decision {
            PermissionDecision::Deny { reason } => {
                assert!(reason.contains("write_file"));
                assert!(reason.contains("Reconstructor"));
            }
            _ => panic!("Expected Deny decision, got {:?}", decision),
        }
    }

    #[test]
    fn test_permission_checker_context_blocking() {
        let mut registry = ToolRegistry::new();
        register_builtins(&mut registry);

        let ctx = PermissionContext::new().deny_name("shell");
        let checker = PermissionChecker::new(
            PermissionLevel::Declassifier,
            ctx,
        );

        // Even Declassifier can't use shell if context blocks it
        let decision = checker.authorize("shell", &registry);
        match decision {
            PermissionDecision::Deny { reason } => {
                assert!(reason.contains("blocked by context"));
            }
            _ => panic!("Expected Deny decision, got {:?}", decision),
        }
    }

    #[test]
    fn test_permission_checker_level_change() {
        let mut registry = ToolRegistry::new();
        register_builtins(&mut registry);

        let mut checker = PermissionChecker::new(
            PermissionLevel::Observer,
            PermissionContext::default(),
        );

        // Initially should deny write
        let decision1 = checker.authorize("write_file", &registry);
        assert!(matches!(decision1, PermissionDecision::Deny { .. }));

        // Upgrade to Reconstructor
        checker.set_level(PermissionLevel::Reconstructor);
        let decision2 = checker.authorize("write_file", &registry);
        assert_eq!(decision2, PermissionDecision::Allow);

        // Verify level accessor
        assert_eq!(checker.level(), PermissionLevel::Reconstructor);
    }

    #[test]
    fn test_tool_result_entry_error() {
        let entry = ToolResultEntry {
            tool_name: "shell".to_string(),
            output: "ERROR: command not found".to_string(),
            is_error: true,
            hook_feedback: Some("Command execution blocked".to_string()),
        };

        assert!(entry.is_error);
        assert_eq!(entry.tool_name, "shell");
        assert!(entry.hook_feedback.is_some());
        assert_eq!(entry.hook_feedback.unwrap(), "Command execution blocked");
    }

    #[test]
    fn test_stop_cause_equality() {
        assert_eq!(StopCause::Complete, StopCause::Complete);
        assert_eq!(StopCause::MaxIterations, StopCause::MaxIterations);
        assert_ne!(StopCause::Complete, StopCause::MaxIterations);

        let perm1 = StopCause::PermissionDenied { tool_name: "shell".to_string() };
        let perm2 = StopCause::PermissionDenied { tool_name: "shell".to_string() };
        let perm3 = StopCause::PermissionDenied { tool_name: "exec".to_string() };

        assert_eq!(perm1, perm2);
        assert_ne!(perm1, perm3);
    }
}
