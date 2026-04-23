# DNS Configuration for redacted.bond

## Current Nameservers
- hyperion.dns-parking.com
- atlas.dns-parking.com

## Required DNS Records

Login to your DNS management panel at:
https://dns-parking.com (or your registrar's control panel)

### Add These A Records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 69.62.116.165 | 3600 |
| A | app | 69.62.116.165 | 3600 |
| A | api | 69.62.116.165 | 3600 |
| A | status | 69.62.116.165 | 3600 |
| A | docs | 69.62.116.165 | 3600 |
| A | * | 69.62.116.165 | 3600 |

### Remove These Records (if exist):
- Any CNAME records pointing to vercel.app
- Any A records pointing to other IPs
- Any URL redirects

## Verification

After adding records, wait 5-10 minutes then verify:

```bash
# Check DNS resolution
nslookup redacted.bond
nslookup app.redacted.bond
nslookup api.redacted.bond

# Check if all point to VPS
dig +short redacted.bond
dig +short app.redacted.bond
dig +short api.redacted.bond

# Should all return: 69.62.116.165
```

## URLs After DNS Propagation

- **Main:** https://redacted.bond
- **Dashboard:** https://app.redacted.bond
- **API:** https://api.redacted.bond
- **Status:** https://status.redacted.bond
- **Docs:** https://docs.redacted.bond
