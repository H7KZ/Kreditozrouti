# Manual setup

These guides describe the outcome each external service must provide. They avoid dashboard menu paths so the steps
remain usable when a vendor changes its interface.

- [Gmail SMTP](GMAIL.md) - prepare an app password, supply API secrets, verify the mail connection
- [DNS and HTTPS](DNS.md) - point public hostnames at the shared Traefik origin and verify routing and TLS

Keep Gmail credentials in the local untracked `.env` or the appropriate GitHub environment secrets. The separate
Infrastructure repository owns shared Traefik and its Cloudflare DNS challenge token.
