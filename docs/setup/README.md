# Manual setup

- [Gmail SMTP](GMAIL.md) - optional API email credentials and verification
- [DNS and HTTPS](DNS.md) - app hostnames, ingress, and TLS checks

Keep credentials in an untracked local `.env` or GitHub environment secrets ([Secrets and config](../runbooks/secrets-and-config.md)). On a shared host the Infrastructure repository owns Traefik and its Cloudflare token; on a dedicated server this repository's own [ingress](../../deployment/ingress/README.md) does.
