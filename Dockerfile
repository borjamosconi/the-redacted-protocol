# =============================================================================
# Redacted Protocol Agent — Production Docker Image
# =============================================================================
# Build: docker build -t redacted-protocol .
# Run:   docker run -d --env-file .env --name rd-agent redacted-protocol
# =============================================================================

# Build stage
FROM rust:1.83-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first (for layer caching)
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/

# Build release binary
RUN cargo build --release --bin rd

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash rd-agent

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/rd /usr/local/bin/rd
COPY .env.example .env

# Create data directory for sessions
RUN mkdir -p /app/data/sessions && chown -R rd-agent:rd-agent /app/data

USER rd-agent

ENV RUST_LOG=rd_core=info,rd_tools=info,rd_hooks=info,rd_providers=info
ENV NODE_ENV=production

# Health check endpoint (built into agent)
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/rd"]
CMD ["--telegram"]
