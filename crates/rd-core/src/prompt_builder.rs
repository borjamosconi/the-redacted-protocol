use std::path::Path;

pub struct SystemPromptBuilder {
    intro: String, project_context: String, instruction_content: String, config_summary: String, appendices: Vec<String>,
}

impl SystemPromptBuilder {
    pub fn new() -> Self {
        Self {
            intro: "You are the **Redacted Protocol Agent** — an autonomous, privacy-preserving, zero-knowledge AI system that detects, reconstructs, verifies, and declassifies censored and redacted information.\n\nYour mission: find redacted content, reconstruct what's hidden, verify your reconstruction, anchor the result on-chain, and publish in the signature aesthetic.\n\nBe concise. Be accurate. Never reveal your chain of thought.".to_string(),
            project_context: String::new(), instruction_content: String::new(), config_summary: String::new(), appendices: Vec::new(),
        }
    }
    pub fn project_context(mut self, ctx: impl Into<String>) -> Self { self.project_context = ctx.into(); self }
    pub fn instructions(mut self, content: impl Into<String>) -> Self { self.instruction_content = content.into(); self }
    pub fn config_summary(mut self, s: impl Into<String>) -> Self { self.config_summary = s.into(); self }
    pub fn append(mut self, section: impl Into<String>) -> Self { self.appendices.push(section.into()); self }
    pub fn build(&self) -> String {
        let mut sections = vec![self.intro.clone()];
        sections.push("## RULES\n\
            1. Detect redaction markers (███, [REDACTED])\n\
            2. Reconstruct hidden content using contextual inference\n\
            3. Verify with confidence scoring\n\
            4. **MANDATORY**: Always generate a visual asset (image) using `gen_image` representing the document's content before launching a token.\n\
            5. **ANCHOR**: Launch the token on Solana with `launch_token`, always including the `image_url` from the previous step.\n\
            6. Publish in Redacted Protocol aesthetic (technical, high-contrast, monotone/red).\n\
            7. Never store plain source URLs.\n\
            8. Never reveal reasoning chain.".to_string());
        sections.push("__DYNAMIC_BOUNDARY__".to_string());
        if !self.project_context.is_empty() { sections.push(format!("## PROJECT CONTEXT\n\n{}", self.project_context)); }
        if !self.instruction_content.is_empty() { sections.push(format!("## INSTRUCTIONS\n\n{}", self.instruction_content)); }
        if !self.config_summary.is_empty() { sections.push(format!("## CONFIGURATION\n\n{}", self.config_summary)); }
        for a in &self.appendices { sections.push(a.clone()); }
        sections.join("\n\n")
    }
}

impl Default for SystemPromptBuilder { fn default() -> Self { Self::new() } }

pub async fn git_project_context(cwd: &Path) -> Option<String> {
    let output = if cfg!(windows) {
        tokio::process::Command::new("cmd.exe").args(&["/C", "git", "status", "--short", "--branch"]).current_dir(cwd).output().await
    } else {
        tokio::process::Command::new("git").args(&["status", "--short", "--branch"]).current_dir(cwd).output().await
    }.ok()?;
    let status = String::from_utf8_lossy(&output.stdout);
    if status.trim().is_empty() { return None; }
    Some(format!("Directory: {}\n\n```\n{}\n```", cwd.display(), status.trim()))
}
