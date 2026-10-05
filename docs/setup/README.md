# Manual setup

- [Gmail SMTP](GMAIL.md) - optional API email credentials and verification
- [DNS and HTTPS](DNS.md) - app hostnames, shared Traefik, and TLS checks

Keep credentials in an untracked local `.env` or GitHub environment secrets. The separate Infrastructure repo owns shared Traefik and its Cloudflare token.
