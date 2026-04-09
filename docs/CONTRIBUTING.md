# Contributing

Thank you for your interest in Redacted Protocol! We welcome contributions of all kinds.

---

## Code of Conduct

This project follows a simple principle: **be respectful, be helpful, be constructive**. Disagreements are fine; disrespect is not.

---

## How to Contribute

### 1. Report Bugs

Open a [GitHub Issue](https://github.com/whalesconspiracy-33/the_redacted_protocol/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (`rustc --version`, OS)

### 2. Suggest Features

Open an issue with:
- A clear description of the feature
- Why it would be valuable
- Any implementation ideas you have

### 3. Submit Pull Requests

1. **Fork** the repository
2. **Create a branch** (`git checkout -b feature/my-feature`)
3. **Make your changes**
4. **Test** (`cargo test --workspace`)
5. **Lint** (`cargo clippy --workspace --all-targets -- -D warnings`)
6. **Format** (`cargo fmt --workspace`)
7. **Commit** with a clear message
8. **Push** and open a PR

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/the_redacted_protocol.git
cd the_redacted_protocol

# Build
cargo build

# Test
cargo test --workspace

# Lint
cargo clippy --workspace --all-targets -- -D warnings

# Format
cargo fmt --workspace
```

---

## Coding Standards

### Rust Style

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` — no exceptions
- Use `cargo clippy` — all warnings must be fixed
- Write doc comments for all `pub` items

### Error Handling

- Use `thiserror` for library errors
- Use `anyhow` for application errors (CLI)
- Never use `.unwrap()` in library code — use `?` or `.expect("clear reason")`

### Testing

- Write unit tests for new functionality
- Use `#[cfg(test)]` modules
- Test edge cases, not just happy paths

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ZK proof verification
fix: resolve lifetime issue in orchestrator
docs: update free setup guide
test: add session persistence tests
refactor: simplify tool registry
```

---

## Architecture Guidelines

When adding new features:

1. **Keep crates independent** — avoid circular dependencies
2. **Use traits for abstraction** — `Provider`, `ToolHandler`, etc.
3. **Make errors descriptive** — include context about what failed and why
4. **Test with free models** — ensure features work with OpenRouter free tier

---

## License

By contributing, you agree that your contributions will be licensed under the **MIT License**.

---

**"The truth cannot be redacted."**
