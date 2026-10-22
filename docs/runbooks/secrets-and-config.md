# Secrets and config

Use this to find where a setting lives, to set up a new GitHub Environment, or to rotate a credential. Names only: never
commit or paste values. `.github/workflows/_deploy.yml` (the `Build private incoming packet` step) is the exact mapping from
GitHub to the application; `deployment/render-env.sh` turns it into the dotenv a release carries.

GitHub Environments: `production`, `development`, `monitoring`, `ingress`. A repository-level secret is visible to every
environment; an environment-level one overrides it. Use repository level for the connection secrets and environment level
for everything else.

## Connection (repository level)

| Name                   | Kind     | What                                                                                                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SSH_HOST`             | secret   | VPS address                                                                                                                                       |
| `SSH_PORT`             | secret   | SSH port                                                                                                                                          |
| `SSH_PRIVATE_KEY`      | secret   | Private key of the deploy user. Root-equivalent: treat it that way                                                                                |
| `SSH_HOST_FINGERPRINT` | secret   | `SHA256:...` of the host key (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`). Required: the workflow refuses to connect without it |
| `SSH_USER`             | variable | Deploy user name (normally `deploy`)                                                                                                              |

## Application (`production` and `development`)

| Name                                                                                 | Kind             | What                                                                                                    |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `PROJECT`                                                                            | variable         | Distinct route suffix per environment (`prod`, `dev`). Never the same twice                             |
| `DOMAIN`                                                                             | variable         | Public host (`kreditozrouti.cz`, `dev.kreditozrouti.cz`). Also used for the health checks               |
| `MYSQL_USER`, `MYSQL_DATABASE`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_URI` | secrets          | MySQL setup and the application connection string. `MYSQL_URI` must match the others                    |
| `REDIS_PASSWORD`, `REDIS_URI`                                                        | secrets          | Redis password and connection string                                                                    |
| `API_SESSION_SECRET`, `API_COMMAND_TOKEN`, `MCP_JWT_SECRET`                          | secrets          | Application authentication. Rotating them logs users out / invalidates tokens                           |
| `GOOGLE_USER`, `GOOGLE_APP_PASSWORD`                                                 | secrets          | Optional Gmail SMTP, production only (development always gets empty values). [Setup](../setup/GMAIL.md) |
| `UMAMI_WEBSITE_ID`, `UMAMI_SRC`                                                      | secret, variable | Optional web analytics, baked into the web container's runtime config                                   |
| `PHPMYADMIN_BASIC_AUTH`                                                              | secret           | htpasswd line gating `/phpmyadmin` on development. Empty = every request rejected                       |

Generate secrets with `openssl rand -base64 32`; `htpasswd -nbB <user> <password>` for the htpasswd line (comma-separate
users). Dotenv values are written literally (single-quoted): `$`, `#` and backticks are fine, but a single quote, a control
character or a trailing backslash in a value fails the deploy without printing it.

Settings that must survive a restore unchanged: `MYSQL_*` only matter for the new empty database being created, and a
restore loads the dump over it, so new values are fine as long as `MYSQL_URI` matches. `REDIS_PASSWORD` can change freely.

## Monitoring (`monitoring`)

| Name                                                             | Kind    | What                                                                                          |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `GRAFANA_ADMIN_USER` (default `admin`), `GRAFANA_ADMIN_PASSWORD` | secrets | Grafana administrator                                                                         |
| `DISCORD_WEBHOOK_URL`                                            | secret  | Alertmanager notifications; written to a private file, not env                                |
| `HEALTHCHECKS_PING_URL`                                          | secret  | Watchdog heartbeat that proves the alert pipeline is alive                                    |
| `UMAMI_DB_NAME`, `UMAMI_DB_USER`, `UMAMI_DB_PASSWORD`            | secrets | Umami's PostgreSQL database. Changing them on an existing volume does not rename the database |
| `UMAMI_APP_SECRET`                                               | secret  | Umami hashing salt; also seeds Grafana's read-only database role                              |

## Ingress (`ingress`, standalone servers only)

| Name                            | Kind     | What                                                                             |
| ------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `TRAEFIK_DOMAIN`                | variable | Hostname of the Traefik dashboard, e.g. `traefik.kreditozrouti.cz`               |
| `ACME_EMAIL`                    | variable | Let's Encrypt contact                                                            |
| `TRAEFIK_DASHBOARD_ALLOWED_IPS` | variable | Your real client IP or VPN CIDR(s). Fails closed (nobody gets in) when wrong     |
| `TRAEFIK_HTPASSWD`              | secret   | Full `user:$2y$...` bcrypt line (`htpasswd -nbB`) for the dashboard              |
| `CF_DNS_API_TOKEN`              | secret   | Cloudflare token scoped to `Zone:DNS:Edit` on the zone, for the DNS-01 challenge |
| `CROWDSEC_ENROLL_KEY`           | secret   | Optional enrolment key for app.crowdsec.net                                      |

## Backups

Repository level, for **Backup Verify**: variable `BACKUP_BUCKET`; secrets `BACKUP_B2_READER_KEY_ID`, `BACKUP_B2_READER_KEY`
(read-only), `BACKUP_AGE_IDENTITY` (private key contents), `BACKUP_HC_FRESHNESS_URL`, `BACKUP_HC_DRILL_URL`.
On the VPS (never in GitHub): `/etc/toolkit/kreditozrouti.env`, see [Backups](backups.md#host-setup).

## Recovery kit (offline)

Keep outside GitHub and the VPS: the age identity, B2 admin/writer/reader keys, Healthchecks URLs, Cloudflare token, the
current values of `MYSQL_ROOT_PASSWORD`, `API_SESSION_SECRET`, `API_COMMAND_TOKEN`, `MCP_JWT_SECRET`, and a copy of the
`TRAEFIK_HTPASSWD` source password.

## Rotating a secret

1. Change it in GitHub (environment level wins over repository level).
2. Dispatch **Deploy** (or **Deploy Monitoring** / **Deploy Ingress**) for that environment. Rollback restores the
   _saved_ values, so it never picks up a rotation.
3. SSH keys: add the new public key to the deploy user first, switch `SSH_PRIVATE_KEY`, then remove the old key.

## Web runtime settings

Vite bundles environment values at build time, so one web image serves every environment: the web Dockerfile embeds
placeholders for `VITE_API_URL`, `VITE_FARO_COLLECTOR_URL`, `VITE_APP_VERSION`, `VITE_APP_ENV`, `VITE_UMAMI_WEBSITE_ID` and
`VITE_UMAMI_SRC`, and [`docker-entrypoint.sh`](../../apps/web/docker-entrypoint.sh) replaces them from the container
environment at start. Every such variable must also be in `build.env` of the root [`turbo.json`](../../turbo.json), or
Turbo's strict environment mode strips it and there is nothing to replace. Adding one:
[Add a service](add-a-service.md#new-environment-variable).

## Local development

Copy the root [`.env.example`](../../.env.example) to an untracked `.env`. The local Compose file has its own Traefik and
needs none of the above.

## Verify

A deploy that fails with `missing <NAME>` from `render-env.sh` names the absent secret. After rotation, the run's health
step passes and `deployment/toolkit doctor` stays clean.
