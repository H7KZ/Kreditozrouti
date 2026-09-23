# Gmail SMTP setup

The API uses `smtp.gmail.com:587` with required TLS. Email is enabled only when both `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` are present. At startup, the API verifies the SMTP connection and logs `mailer.configured` on success. See [`Config.ts`](../../api/src/Config/Config.ts), [`mailer.ts`](../../api/src/clients/mailer.ts), and [`index.ts`](../../api/src/index.ts).

## Prepare the Google account

1. Choose the Google account that will send application mail and enable 2-Step Verification.
2. Create an app password for this application. Save the generated value as `GOOGLE_APP_PASSWORD`; use the account's full email address as `GOOGLE_USER`. Do not use the normal account password.
3. If app passwords are unavailable, check the account's organization and protection settings. Google lists work or school account policies, security-key-only 2-Step Verification, and Advanced Protection as possible reasons. Changing the Google account password revokes existing app passwords, so replace the saved value after a password change. [Google Account Help](https://support.google.com/accounts/answer/185833?hl=en)

## Supply credentials

| Environment | Where to put the values |
|-------------|-------------------------|
| Local | Copy [`.env.example`](../../.env.example) to an untracked `.env` and set `GOOGLE_USER` and `GOOGLE_APP_PASSWORD`. |
| Development and production | Set `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` as secrets for each matching GitHub deployment environment. The [deploy workflow](../../.github/workflows/_deploy-service.yml) passes them into that environment's API container. |

Keep the app password out of commits, screenshots, and logs. Leave both values empty where email should stay disabled.

## Verify the outcome

1. Start or deploy the API with both values set. Confirm it starts and logs `mailer.configured`. An SMTP authentication or connection failure prevents startup before that log entry.
2. When an application flow sends mail, send a message to an address you control and confirm receipt, including spam filtering. SMTP verification at startup checks connectivity and authentication; it does not prove message delivery. The current API has an `EmailService.sendEmail` helper, but no in-repo caller, so a live delivery check needs an actual sending flow or an operator-run SMTP check.
3. If setup fails, confirm the account address, app password, 2-Step Verification state, and whether the password was revoked. Replace the secret without printing its value.

This setup sends through Google's SMTP service. This repo does not configure domain mail hosting or Gmail DNS records.
