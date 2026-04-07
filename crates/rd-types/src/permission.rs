//! Permission levels — controls what tools are allowed to execute.
//!
//! The permission model has three tiers, each allowing progressively
//! more dangerous operations.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Permission mode governing tool execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum PermissionLevel {
    /// Only read-only tools allowed (file read, search, inspect).
    /// No filesystem writes, no network calls, no shell execution.
    Observer = 0,

    /// Allows workspace writes (file edits, document creation).
    /// No shell execution, no destructive operations.
    Reconstructor = 1,

    /// Full access: shell execution, network calls, publishing,
    /// blockchain transactions, permanent storage uploads.
    Declassifier = 2,
}

impl fmt::Display for PermissionLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Observer => write!(f, "observer"),
            Self::Reconstructor => write!(f, "reconstructor"),
            Self::Declassifier => write!(f, "declassifier"),
        }
    }
}

impl PermissionLevel {
    /// Check if this level allows at least the given level.
    pub fn allows(&self, required: PermissionLevel) -> bool {
        *self as u8 >= required as u8
    }

    /// Parse from string (accepts aliases).
    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().trim() {
            "observer" | "readonly" | "read_only" | "0" => Some(Self::Observer),
            "reconstructor" | "workspace_write" | "write" | "1" => Some(Self::Reconstructor),
            "declassifier" | "full" | "danger" | "full_access" | "2" => Some(Self::Declassifier),
            _ => None,
        }
    }
}

/// A permission context: denies specific tool names and prefixes.
#[derive(Debug, Clone, Default)]
pub struct PermissionContext {
    /// Exact tool names that are denied.
    pub deny_names: std::collections::HashSet<String>,
    /// Tool name prefixes that are denied.
    pub deny_prefixes: Vec<String>,
}

impl PermissionContext {
    /// Create a new permission context.
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a denied tool name.
    pub fn deny_name(mut self, name: impl Into<String>) -> Self {
        self.deny_names.insert(name.into());
        self
    }

    /// Add a denied prefix.
    pub fn deny_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.deny_prefixes.push(prefix.into());
        self
    }

    /// Check if a tool name is blocked by this context.
    pub fn blocks(&self, tool_name: &str) -> bool {
        let lower = tool_name.to_lowercase();
        if self.deny_names.contains(&lower) {
            return true;
        }
        self.deny_prefixes.iter().any(|p| lower.starts_with(&p.to_lowercase()))
    }

    /// Create from iterables.
    pub fn from_iterables(names: impl IntoIterator<Item = String>, prefixes: impl IntoIterator<Item = String>) -> Self {
        Self {
            deny_names: names.into_iter().collect(),
            deny_prefixes: prefixes.into_iter().collect(),
        }
    }
}
