# Gmail SMTP setup

The API uses `smtp.gmail.com:587` with TLS. Email is enabled when both `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` are set. On startup, it verifies SMTP authentication and logs `mailer.configured` after success. See the [mailer](../../apps/api/src/clients/mailer.ts) and [API startup](../../apps/api/src/index.ts).

## Configure

1. Enable 2-Step Verification for the sending Google account, then create an app password. Set `GOOGLE_USER` to the full email address and `GOOGLE_APP_PASSWORD` to that password. Do not use the normal account password. Google may disallow app passwords for managed accounts or some protection settings. Changing the account password revokes existing app passwords. [Google Account Help](https://support.google.com/accounts/answer/185833?hl=en)
2. For local development, copy [`.env.example`](../../.env.example) to an untracked `.env` and fill both values. For deployed environments, set both as GitHub `production` or `development` environment secrets. The [deploy workflow](../../.github/workflows/_deploy-service.yml) passes them to the API.
3. Deploy or restart the API. Check for `mailer.configured`; an authentication or connection failure prevents successful startup. Leave both values empty where email should stay disabled.

SMTP verification checks authentication and connectivity, not delivery. This repo has an email helper but no current caller, so an end-to-end delivery check needs an actual sending flow or an operator-run SMTP check. Keep credentials out of commits and logs.

This setup sends mail through Google's SMTP server. It does not configure domain mail hosting or Gmail DNS records.
