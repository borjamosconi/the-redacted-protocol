//! Rate limiting for agent operations
//! 
//! Implements sliding window rate limits for:
//! - Inference relay calls (per hour)
//! - Telegram messages (per hour)
//! - Web scraping (per hour)

use std::collections::VecDeque;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tracing::{debug, warn};

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub max_inference_calls_per_hour: u32,
    pub max_telegram_msgs_per_hour: u32,
    pub max_web_scrapes_per_hour: u32,
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
        }
    }
}

#[derive(Debug)]
struct RateLimiter {
    window: Duration,
    max_calls: u32,
    timestamps: Mutex<VecDeque<Instant>>,
}

impl RateLimiter {
    fn new(window: Duration, max_calls: u32) -> Self {
        Self {
            window,
            max_calls,
            timestamps: Mutex::new(VecDeque::new()),
        }
    }

    /// Try to acquire a slot. Returns true if allowed, false if rate limited.
    fn try_acquire(&self) -> bool {
        let now = Instant::now();
        let mut timestamps = self.timestamps.lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        // Remove expired timestamps
        while let Some(&ts) = timestamps.front() {
            if now.duration_since(ts) > self.window {
                timestamps.pop_front();
            } else {
                break;
            }
        }

        // Check if under limit
        if (timestamps.len() as u32) < self.max_calls {
            timestamps.push_back(now);
            debug!("Rate limit: {}/{} calls in window", timestamps.len(), self.max_calls);
            true
        } else {
            warn!("Rate limit exceeded: {}/{} calls in window", timestamps.len(), self.max_calls);
            false
        }
    }

    /// Get remaining calls in current window
    fn remaining(&self) -> u32 {
        let now = Instant::now();
        let timestamps = self.timestamps.lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let active_count = timestamps.iter()
            .filter(|ts| now.duration_since(**ts) <= self.window)
            .count();
        self.max_calls.saturating_sub(active_count as u32)
    }

    /// Get retry-after duration (time until next slot opens)
    fn retry_after(&self) -> Duration {
        let now = Instant::now();
        let timestamps = self.timestamps.lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if let Some(&oldest) = timestamps.front() {
            let expires_at = oldest + self.window;
            if expires_at > now {
                expires_at - now
            } else {
                Duration::ZERO
            }
        } else {
            Duration::ZERO
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
        Self {
            inference_limiter: RateLimiter::new(window, config.max_inference_calls_per_hour),
            telegram_limiter: RateLimiter::new(window, config.max_telegram_msgs_per_hour),
            web_scrape_limiter: RateLimiter::new(window, config.max_web_scrapes_per_hour),
        }
    }

    pub fn from_env() -> Self {
        Self::new(RateLimitConfig::default())
    }

    pub fn try_acquire_inference(&self) -> bool {
        self.inference_limiter.try_acquire()
    }

    pub fn try_acquire_telegram(&self) -> bool {
        self.telegram_limiter.try_acquire()
    }

    pub fn try_acquire_web_scrape(&self) -> bool {
        self.web_scrape_limiter.try_acquire()
    }

    pub fn inference_remaining(&self) -> u32 {
        self.inference_limiter.remaining()
    }

    pub fn telegram_remaining(&self) -> u32 {
        self.telegram_limiter.remaining()
    }

    pub fn web_scrape_remaining(&self) -> u32 {
        self.web_scrape_limiter.remaining()
    }

    pub fn inference_retry_after(&self) -> Duration {
        self.inference_limiter.retry_after()
    }

    pub fn telegram_retry_after(&self) -> Duration {
        self.telegram_limiter.retry_after()
    }

    pub fn web_scrape_retry_after(&self) -> Duration {
        self.web_scrape_limiter.retry_after()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_allows_under_limit() {
        let limiter = RateLimiter::new(Duration::from_secs(60), 10);
        for _ in 0..10 {
            assert!(limiter.try_acquire());
        }
    }

    #[test]
    fn test_rate_limiter_blocks_over_limit() {
        let limiter = RateLimiter::new(Duration::from_secs(60), 5);
        for _ in 0..5 {
            limiter.try_acquire();
        }
        assert!(!limiter.try_acquire());
    }

    #[test]
    fn test_rate_limiter_remaining_count() {
        let limiter = RateLimiter::new(Duration::from_secs(60), 10);
        for _ in 0..3 {
            limiter.try_acquire();
        }
        assert_eq!(limiter.remaining(), 7);
    }

    #[test]
    fn test_rate_limiter_retry_after() {
        let limiter = RateLimiter::new(Duration::from_secs(60), 1);
        limiter.try_acquire();
        let retry = limiter.retry_after();
        assert!(retry <= Duration::from_secs(60));
        assert!(retry > Duration::ZERO);
    }

    #[test]
    fn test_rate_limiter_resets_after_window() {
        use std::thread;
        let limiter = RateLimiter::new(Duration::from_millis(100), 2);
        limiter.try_acquire();
        limiter.try_acquire();
        assert!(!limiter.try_acquire());
        
        // Wait for window to expire
        thread::sleep(Duration::from_millis(150));
        
        // Should allow calls again
        assert!(limiter.try_acquire());
    }
}
