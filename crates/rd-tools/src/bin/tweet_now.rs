use rd_tools::twitter::TwitterClientV1;
use dotenvy;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    
    let client = TwitterClientV1::from_env().expect("Missing Twitter V1 credentials in .env");
    println!("Authenticating and posting to X...");
    
    let text = "THE ARCHIVE IS BREATHING. // Redacted Protocol initialized on X. The truth has a market cap. 🔴 #Solana #AI";
    
    match client.post_tweet(text).await {
        Ok(id) => println!("Success! Tweet published with ID: {}", id),
        Err(e) => println!("Failed to post tweet: {}", e),
    }
    
    Ok(())
}
