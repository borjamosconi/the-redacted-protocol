//! Rate limiting for agent operations
//! 
//! Implements sliding window rate limits for:
//! - Inference relay calls (per hour)
//! - Telegram messages (per hour)
//! - Web scraping (per hour)
//! 
//! Supports Redis-backed centralized rate limiting for production hardening.

use std::collections::VecDeque;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tracing::{info, debug, warn, error};
use redis::AsyncCommands;

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub max_inference_calls_per_hour: u32,
    pub max_telegram_msgs_per_hour: u32,
    pub max_web_scrapes_per_hour: u32,
    pub redis_url: Option<String>,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_inference_calls_per_hour: std::env::var("RATE_LIMIT_X_PER_HOUR")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(50),
            max_telegram_msgs_per_hour: std::env::var("RATE_LIMIT_TELEGRAM_PER_HOUR")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(100),
            max_web_scrapes_per_hour: std::env::var("RATE_LIMIT_WEB_SCRAPE_PER_HOUR")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(200),
            redis_url: std::env::var("REDIS_URL").ok()
                .or_else(|| std::env::var("UPSTASH_REDIS_URL").ok()),
        }
    }
}

enum LimiterStrategy {
    InMemory {
        window: Duration,
        max_calls: u32,
        timestamps: Mutex<VecDeque<Instant>>,
    },
    Redis {
        client: redis::Client,
        key: String,
        window_secs: u64,
        max_calls: u32,
    },
}

pub struct RateLimiter {
    strategy: LimiterStrategy,
}

impl RateLimiter {
    fn new_memory(window: Duration, max_calls: u32) -> Self {
        Self {
            strategy: LimiterStrategy::InMemory {
                window,
                max_calls,
                timestamps: Mutex::new(VecDeque::new()),
            },
        }
    }

    fn new_redis(url: &str, key: &str, window_secs: u64, max_calls: u32) -> Result<Self, String> {
        let client = redis::Client::open(url).map_err(|e| e.to_string())?;
        Ok(Self {
            strategy: LimiterStrategy::Redis {
                client,
                key: key.to_string(),
                window_secs,
                max_calls,
            },
        })
    }

    /// Try to acquire a slot. Returns true if allowed, false if rate limited.
    pub async fn try_acquire(&self) -> bool {
        match &self.strategy {
            LimiterStrategy::InMemory { window, max_calls, timestamps } => {
                let now = Instant::now();
                let mut timestamps = timestamps.lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());

                // Remove expired timestamps
                while let Some(&ts) = timestamps.front() {
                    if now.duration_since(ts) > *window {
                        timestamps.pop_front();
                    } else {
                        break;
                    }
                }

                // Check if under limit
                if (timestamps.len() as u32) < *max_calls {
                    timestamps.push_back(now);
                    debug!("Rate limit: {}/{} calls in window (InMemory)", timestamps.len(), max_calls);
                    true
                } else {
                    warn!("Rate limit exceeded: {}/{} calls in window (InMemory)", timestamps.len(), max_calls);
                    false
                }
            }
            LimiterStrategy::Redis { client, key, window_secs, max_calls } => {
                match client.get_async_connection().await {
                    Ok(mut conn) => {
                        let now = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                        let window_start = now - window_secs;

                        // Atomic sliding window using Redis Sorted Set (ZSET)
                        let script = redis::Script::new(r#"
                            local key = KEYS[1]
                            local now = tonumber(ARGV[1])
                            local window_start = tonumber(ARGV[2])
                            local max_calls = tonumber(ARGV[3])
                            
                            redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
                            local count = redis.call('ZCARD', key)
                            
                            if count < max_calls then
                                redis.call('ZADD', key, now, now)
                                redis.call('EXPIRE', key, ARGV[4])
                                return 1
                            else
                                return 0
                            end
                        "#);

                        let result: i32 = match script
                            .key(key)
                            .arg(now)
                            .arg(window_start)
                            .arg(max_calls)
                            .arg(window_secs)
                            .invoke_async(&mut conn)
                            .await
                        {
                            Ok(res) => res,
                            Err(e) => {
                                error!("Redis script error: {}. Falling back to ALLOW.", e);
                                1
                            }
                        };

                        if result == 1 {
                            debug!("Rate limit: slot acquired (Redis: {})", key);
                            true
                        } else {
                            warn!("Rate limit exceeded (Redis: {})", key);
                            false
                        }
                    }
                    Err(e) => {
                        error!("Failed to connect to Redis: {}. Falling back to ALLOW.", e);
                        true
                    }
                }
            }
        }
    }

    /// Get retry-after duration (time until next slot opens)
    pub async fn retry_after(&self) -> Duration {
        match &self.strategy {
            LimiterStrategy::InMemory { window, timestamps, .. } => {
                let now = Instant::now();
                let timestamps = timestamps.lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
                if let Some(&oldest) = timestamps.front() {
                    let expires_at = oldest + *window;
                    if expires_at > now {
                        expires_at - now
                    } else {
                        Duration::ZERO
                    }
                } else {
                    Duration::ZERO
                }
            }
            LimiterStrategy::Redis { client, key, .. } => {
                match client.get_async_connection().await {
                    Ok(mut conn) => {
                        let oldest: Option<u64> = conn.zrangebyscore_withscores(key, "-inf", "+inf").await
                            .ok()
                            .and_then(|vec: Vec<(u64, u64)>| vec.first().map(|(_, score)| *score));
                        
                        if let Some(_timestamp) = oldest {
                            let _now = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_secs();
                            // In a real sliding window, the next slot opens after window_secs from the oldest entry
                            // For simplicity, we return a 30s fallback if we can't calculate perfectly
                            Duration::from_secs(30)
                        } else {
                            Duration::ZERO
                        }
                    }
                    Err(_) => Duration::ZERO
                }
            }
        }
    }
}

pub struct RateLimiterSet {
    inference_limiter: RateLimiter,
    telegram_limiter: RateLimiter,
    web_scrape_limiter: RateLimiter,
}

impl RateLimiterSet {
    pub fn new(config: RateLimitConfig) -> Self {
        let window = Duration::from_secs(3600); // 1 hour
        let window_secs = 3600;

        if let Some(url) = config.redis_url {
            info!("Using Redis-backed rate limiting: {}", url);
            let inf = RateLimiter::new_redis(&url, "rd:rate:inference", window_secs, config.max_inference_calls_per_hour);
            let tg = RateLimiter::new_redis(&url, "rd:rate:telegram", window_secs, config.max_telegram_msgs_per_hour);
            let web = RateLimiter::new_redis(&url, "rd:rate:web", window_secs, config.max_web_scrapes_per_hour);

            if let (Ok(inf), Ok(tg), Ok(web)) = (inf, tg, web) {
                return Self {
                    inference_limiter: inf,
                    telegram_limiter: tg,
                    web_scrape_limiter: web,
                };
            }
            error!("Failed to initialize Redis limiters. Falling back to InMemory.");
        }

        Self {
            inference_limiter: RateLimiter::new_memory(window, config.max_inference_calls_per_hour),
            telegram_limiter: RateLimiter::new_memory(window, config.max_telegram_msgs_per_hour),
            web_scrape_limiter: RateLimiter::new_memory(window, config.max_web_scrapes_per_hour),
        }
    }

    pub fn from_env() -> Self {
        Self::new(RateLimitConfig::default())
    }

    pub async fn try_acquire_inference(&self) -> bool {
        self.inference_limiter.try_acquire().await
    }

    pub async fn try_acquire_telegram(&self) -> bool {
        self.telegram_limiter.try_acquire().await
    }

    pub async fn try_acquire_web_scrape(&self) -> bool {
        self.web_scrape_limiter.try_acquire().await
    }

    pub async fn inference_retry_after(&self) -> Duration {
        self.inference_limiter.retry_after().await
    }

    pub async fn telegram_retry_after(&self) -> Duration {
        self.telegram_limiter.retry_after().await
    }

    pub async fn web_scrape_retry_after(&self) -> Duration {
        self.web_scrape_limiter.retry_after().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_allows_under_limit() {
        let limiter = RateLimiter::new_memory(Duration::from_secs(60), 10);
        for _ in 0..10 {
            assert!(limiter.try_acquire().await);
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_over_limit() {
        let limiter = RateLimiter::new_memory(Duration::from_secs(60), 5);
        for _ in 0..5 {
            limiter.try_acquire().await;
        }
        assert!(!limiter.try_acquire().await);
    }

    #[tokio::test]
    async fn test_rate_limiter_retry_after() {
        let limiter = RateLimiter::new_memory(Duration::from_secs(60), 1);
        limiter.try_acquire().await;
        let retry = limiter.retry_after().await;
        assert!(retry <= Duration::from_secs(60));
        assert!(retry > Duration::ZERO);
    }

    #[tokio::test]
    async fn test_rate_limiter_resets_after_window() {
        let limiter = RateLimiter::new_memory(Duration::from_millis(100), 2);
        limiter.try_acquire().await;
        let _ = limiter.try_acquire().await;
        assert!(!limiter.try_acquire().await);
        
        // Wait for window to expire
        tokio::time::sleep(Duration::from_millis(150)).await;
        
        // Should allow calls again
        assert!(limiter.try_acquire().await);
    }
}
