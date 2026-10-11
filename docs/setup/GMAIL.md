# Gmail SMTP setup

The API uses `smtp.gmail.com:587` with TLS. Email is enabled when both `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` are set. On startup, it verifies SMTP authentication and logs `mailer.configured` after success. See the [mailer](../../apps/api/src/clients/mailer.ts) and [API startup](../../apps/api/src/index.ts).

Deployed development always disables email: `deployment/render-env.sh` freezes both Google values as empty, even when GitHub repository secrets are inherited. This prevents SMTP login failures from blocking development startup and prevents development from sending real mail. Production retains the configured credentials and SMTP startup verification. Redeploy development with a new snapshot to apply this change; activating an existing snapshot preserves its saved configuration.

## Configure

1. Enable 2-Step Verification for the sending Google account, then create an app password. Set `GOOGLE_USER` to the full email address and `GOOGLE_APP_PASSWORD` to that password. Do not use the normal account password. Google may disallow app passwords for managed accounts or some protection settings. Changing the account password revokes existing app passwords. [Google Account Help](https://support.google.com/accounts/answer/185833?hl=en)
2. For production deployments, set both as GitHub `production` environment secrets. The [deploy workflow](../../.github/workflows/_deploy-service.yml) passes them through the renderer to the API. Deployed development ignores Google credentials; leave the values empty in local [`.env`](../../.env.example) unless explicitly testing SMTP.
3. Deploy or restart the API. Check for `mailer.configured`; an authentication or connection failure prevents successful startup. Leave both values empty where email should stay disabled.

SMTP verification checks authentication and connectivity, not delivery. This repo has an email helper but no current caller, so an end-to-end delivery check needs an actual sending flow or an operator-run SMTP check. Keep credentials out of commits and logs.

This setup sends mail through Google's SMTP server. It does not configure domain mail hosting or Gmail DNS records.
