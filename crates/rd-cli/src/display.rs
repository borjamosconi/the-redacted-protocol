use rd_types::block::ContentBlock;

pub fn format_assistant_response(block: &ContentBlock) {
    match block {
        ContentBlock::Text { text } => println!("\n{}", text),
        ContentBlock::ToolUse { id, name, input } => {
            println!("\n[TOOL CALL] {} ({})", name, id);
            if let Some(obj) = input.as_object() { for (k, v) in obj { println!("  {} = {}", k, v); } }
        }
        ContentBlock::ToolResult { tool_use_id: _, tool_name, output, is_error } => {
            let prefix = if *is_error { "[TOOL ERROR]" } else { "[TOOL RESULT]" };
            println!("\n{} {}\n{}", prefix, tool_name, &output.chars().take(500).collect::<String>());
            if output.len() > 500 { println!("...[truncated]"); }
        }
    }
}
