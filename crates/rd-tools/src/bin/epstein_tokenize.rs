use rd_core::Orchestrator;
use rd_providers::Provider;
use rd_providers::openrouter::OpenRouterProvider;
use rd_tools::solana::SolanaClient;
use rd_tools::launch_token::launch_document_token;
use std::fs;
use sha2::Digest;
use tracing::{info, warn, error};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    info!("Starting Epstein Document Tokenization on Devnet...");

    // 1. Read the mock Epstein file
    let file_path = "epstein_logs_fragment.txt";
    let content = fs::read_to_string(file_path)?;
    info!("Read file: {} ({} bytes)", file_path, content.len());

    // 2. Setup Orchestrator for Reconstruction
    let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY not set");
    let provider = OpenRouterProvider::new(api_key);
    let settings = rd_config::RuntimeSettings::default();
    let mut orch: Orchestrator<OpenRouterProvider> = Orchestrator::new(
        provider,
        rd_tools::ToolRegistry::new(),
        rd_hooks::HookRunner::from_settings(&settings),
        settings,
    );

    // 3. Reconstruct Document
    info!("Reconstructed document via AI...");
    let prompt = format!(
        "You are a declassification agent. Reconstruct the following redacted Epstein document fragment. \
        Identify probable names and locations. Output the reconstruction and a confidence score.\n\n\
        FILE CONTENT:\n{}\n\n\
        Respond with the reconstruction text and then 'CONFIDENCE: <number>'",
        content
    );
    
    let summary = orch.run_turn(&prompt).await.map_err(|e| anyhow::anyhow!("Orchestrator error: {:?}", e))?;
    let response_text: String = summary.assistant_blocks.iter()
        .filter_map(|b| {
            if let rd_types::block::ContentBlock::Text { text } = b { Some(text.clone()) } else { None }
        })
        .collect::<Vec<_>>()
        .join("\n");
    
    info!("AI Reconstruction complete.");
    println!("--- RECONSTRUCTION ---\n{}\n-----------------------", response_text);

    // 4. Submit to Solana Devnet (Anchoring)
    let solana = SolanaClient::from_env().await.map_err(|e| anyhow::anyhow!("Solana client error: {}", e))?;
    let content_hash = format!("{:x}", sha2::Sha256::digest(content.as_bytes()));
    let recon_hash = format!("{:x}", sha2::Sha256::digest(response_text.as_bytes()));
    
    info!("Anchoring fragment on Solana Devnet...");
    // Mocking Arweave TX for this demo
    let mock_arweave_tx = "MOCK_ARWEAVE_TX_EPSTEIN_2024";
    
    match solana.submit_fragment(&content_hash, &recon_hash, mock_arweave_tx, 95, vec!["epstein".to_string(), "leaked".to_string()]).await {
        Ok(res) => {
            info!("✅ Anchored on Solana Devnet: tx={}", res.tx_signature.0);
            info!("Fragment Address: {}", res.fragment_address);
        }
        Err(e) => {
            warn!("Solana anchoring failed: {}", e);
        }
    }

    // 5. Launch Token on Bonding Curve
    info!("Launching token for this document on bonding curve...");
    let name = "Epstein Flight Logs Vol.142";
    let symbol = "EPST142";
    let description = "Reconstructed declassified logs from Little Saint James involving Flight N212JE.";
    
    match launch_document_token(
        name,
        symbol,
        description,
        "CLASSIFIED",
        None,
        None,
        95
    ).await {
        Ok(res) => {
            info!("🚀 TOKEN LAUNCHED SUCCESSFULLY!");
            info!("Symbol: ${}", res.symbol);
            info!("Mint: {}", res.mint);
            info!("Terminal: {}", res.terminal_url);
        }
        Err(e) => {
            error!("Token launch failed: {}", e);
            info!("Note: Make sure DASHBOARD_URL is set correctly and the agent is authorized.");
        }
    }

    Ok(())
}
