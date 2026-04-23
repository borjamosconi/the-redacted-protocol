# 🔒 Security Policy

## ⚠️ CRITICAL: Protect Your Secrets

**NEVER commit these files to version control:**
- `.env`, `.env.local`, `.credentials`
- `wallet.json`, `*-wallet.json`
- Any file containing API keys, private keys, or passwords

These files are listed in `.gitignore` to prevent accidental commits.

---

## 🛡️ Security Best Practices

### 1. API Keys Management

| Service | Purpose | Get Your Key |
|---------|---------|--------------|
| OpenRouter | LLM API (Telegram + text reconstruction) | [openrouter.ai](https://openrouter.ai/) |
| Muapi.ai | AI Image/Video generation | [muapi.ai](https://muapi.ai/) |
| Helius | Solana RPC | [helius.dev](https://www.helius.dev/) |
| Upstash | Redis cache (dashboard) | [upstash.com](https://upstash.com/) |
| Telegram Bot | Bot token | [@BotFather](https://t.me/BotFather) |

**Rotate your keys regularly.** If a key is exposed, revoke it immediately and generate a new one.

### 2. File Security

```bash
# Files you MUST keep private:
.env                    # All API keys and configuration
.env.local              # Dashboard secrets
.credentials            # VPS passwords and scripts keys
wallet.json             # Arweave private key
*-wallet.json           # Solana private keys
```

**Check before pushing:**
```bash
git diff --cached --name-only | grep -E '\.env|wallet|credentials'
```

### 3. VPS Security

If you deploy to a VPS:

1. **Use SSH keys instead of passwords**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ssh-copy-id root@your_vps_ip
   ```

2. **Disable password authentication** in `/etc/ssh/sshd_config`:
   ```
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   ```

3. **Setup a firewall** (ufw):
   ```bash
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw enable
   ```

4. **Keep system updated:**
   ```bash
   apt update && apt upgrade -y
   ```

5. **Use fail2ban** to block brute force attacks:
   ```bash
   apt install fail2ban -y
   systemctl enable fail2ban
   ```

### 4. Wallet Security

**Arweave Wallet:**
- Generate a new wallet for production
- Never share your `wallet.json`
- Backup your wallet securely (encrypted USB, password manager)
- Consider using a hardware wallet for mainnet

**Solana Keypair:**
- Generate with: `solana-keygen new --outfile ~/.config/solana/devnet.json`
- Keep devnet and mainnet keys separate
- Never commit keypair files

### 5. Docker Security

When deploying with Docker:

1. **Don't expose unnecessary ports**
2. **Use .env files** for secrets (not hardcoded in docker-compose.yml)
3. **Run containers as non-root** when possible
4. **Keep images updated**

```yaml
# GOOD: Use env_file
services:
  app:
    env_file:
      - .env
    # NOT this: environment:
    #   - API_KEY=hardcoded_value
```

### 6. Telegram Bot Security

- **Never share your bot token** in public repos or documentation
- **Use webhook with HTTPS** (not polling in production)
- **Validate incoming requests** from Telegram
- **Rate limit** your bot responses
- **Log suspicious activity**

### 7. Code Security

- **Scan for secrets** before committing:
  ```bash
  # Install trufflehog
  pip install trufflehog
  
  # Scan repository
  trufflehog --regex --entropy .
  ```

- **Use pre-commit hooks:**
  ```bash
  # .pre-commit-config.yaml
  repos:
    - repo: https://github.com/Yelp/detect-secrets
      rev: v1.4.0
      hooks:
        - id: detect-secrets
  ```

---

## 🚨 If Your Secrets Are Exposed

### Immediate Actions:

1. **Revoke ALL exposed API keys immediately**
   - OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys)
   - Telegram: Send `/revoke` to [@BotFather](https://t.me/BotFather)
   - Muapi.ai: Regenerate from dashboard
   - Helius: Regenerate from dashboard
   - Upstash: Rotate from dashboard

2. **Regenerate wallets**
   - Arweave: Generate new wallet
   - Solana: `solana-keygen new`

3. **Change VPS password**
   ```bash
   passwd
   ```

4. **Check for unauthorized access**
   ```bash
   last              # Recent logins
   history           # Command history
   cat /var/log/auth.log  # Authentication logs
   ```

5. **Remove from git history** (if committed):
   ```bash
   # Install BFG
   java -jar bfg.jar --replace-text passwords.txt
   
   # Or use git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

6. **Force push cleaned history:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

---

## 📋 Security Checklist

Before deploying to production:

- [ ] All API keys are rotated from development values
- [ ] Wallet files are backed up and not in repository
- [ ] `.env` files are in `.gitignore`
- [ ] VPS uses SSH keys (not passwords)
- [ ] Firewall is configured
- [ ] Docker secrets are in env_file (not hardcoded)
- [ ] Telegram bot uses webhook with HTTPS
- [ ] Rate limiting is enabled
- [ ] Logs are monitored
- [ ] Dependencies are updated (`cargo update`, `npm audit fix`)
- [ ] No hardcoded credentials in source code
- [ ] Git history is clean of secrets

---

## 🔍 Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Contact the maintainers privately
3. Provide detailed steps to reproduce
4. Allow reasonable time for a fix before any public disclosure

---

## 📚 Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [TruffleHog - Secret Detection](https://github.com/trufflesecurity/trufflehog)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Rust Security Advisory Database](https://rustsec.org/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

---

**Remember:** Security is not a one-time setup. It's an ongoing process. Stay vigilant! 🔒
