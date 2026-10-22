# Troubleshooting

Use this when a deploy, a route, monitoring or a backup misbehaves. Find the symptom, read the cause, apply the fix. Commands
run on the VPS as the deploy user unless stated. Do not print `.env` files or secrets into shared logs.

## First look

```bash
deployment/toolkit doctor                                   # from ~/kreditozrouti-checkout; host and repository health
docker ps --filter label=com.docker.compose.project=kreditozrouti --format '{{.Names}} {{.Status}}'
docker logs --tail 100 kreditozrouti-api-1
docker stats --no-stream
docker system df
journalctl -u 'toolkit-kreditozrouti-*' -n 100 --no-pager   # as root: boot recovery, backups, jobs
```

Compose services are found by label (`com.docker.compose.project`, `com.docker.compose.service`); container names are not
fixed. Project names: `kreditozrouti`, `kreditozrouti-dev`, `kreditozrouti-monitoring`, `global` (ingress).

## Deploy and workflows

| Symptom (run log or message)                                           | Cause                                                                                                                                                                                                                                    | Fix                                                                                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `shared external network missing; provision its owner first`           | `public-network` does not exist: no ingress has run on this host                                                                                                                                                                         | Deploy the ingress first: **Deploy Ingress** (standalone) or Infrastructure's `traefik` (shared)                                    |
| `external volume not owned by repository` for `traefik-logs-volume`    | A monitoring deploy ran before any ingress and the hook did not create the volume                                                                                                                                                        | Redeploy monitoring from a revision that has the current `monitoring/prepare.sh`; or deploy ingress first                           |
| Ingress stage: `already publishes port 80/443 ... shared mode`         | Another ingress (Infrastructure's Traefik) runs on this host                                                                                                                                                                             | Do not deploy this ingress here. Use shared mode, or [move to a dedicated server](split-to-own-server.md)                           |
| `trusted SSH fingerprint required`                                     | `SSH_HOST_FINGERPRINT` empty or malformed                                                                                                                                                                                                | Set it to `SHA256:...` from `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`                                            |
| `Install the toolkit runner with: sudo deployment/toolkit install ...` | `/usr/local/libexec/toolkit-run-bundle` missing on the host                                                                                                                                                                              | [Fresh server step 3](fresh-server.md#3-install-the-pinned-toolkit-vps-as-deploy-then-root)                                         |
| `Selected source has no deployment/toolkit; it predates toolkit 0.11`  | `ref` points at an old revision                                                                                                                                                                                                          | Deploy a newer `ref`                                                                                                                |
| `missing <NAME>` from `render-env.sh`                                  | A required secret or variable is empty in that GitHub Environment                                                                                                                                                                        | [Secrets and config](secrets-and-config.md)                                                                                         |
| `unsafe dotenv value for <NAME>`                                       | A secret contains `'`, a control character or a trailing backslash                                                                                                                                                                       | Regenerate the value without those characters                                                                                       |
| `release ID already exists; use activate or a new attempt`             | Re-run of an already staged snapshot                                                                                                                                                                                                     | Re-run the workflow (new attempt) or activate that ID with **Rollback**                                                             |
| `promote` finds no qualification                                       | No successful development deploy published one in the last 90 days, or `ref` was never deployed to development                                                                                                                           | Deploy that source to development first, or use `mode=reuse`/`existing`                                                             |
| Public health fails while the app is up                                | The check follows public DNS; DNS still points at another server, or Cloudflare blocks the request (health requests send `User-Agent: toolkit-public-health/1`; allow it in edge/WAF rules, GitHub runner traffic is blocked on purpose) | Verify on the host with `curl --resolve kreditozrouti.cz:443:127.0.0.1 https://kreditozrouti.cz/api/health`; finish the DNS cutover |
| Leftover `~/kreditozrouti/incoming/<env>/<run>-<attempt>/`             | A job was cancelled mid-transfer                                                                                                                                                                                                         | Inspect, then delete the directory; it can contain registry credentials                                                             |
| Two ingress stacks / ports 80 and 443 in use                           | Both Infrastructure's and this repository's Traefik were deployed                                                                                                                                                                        | Remove one: [Move back onto a shared host](split-to-own-server.md#move-back-onto-a-shared-host-standalone-to-shared)                |

### A deploy fails on a data image mismatch

Snapshot deploys never replace MySQL, Redis or the Umami database container when the resolved image differs from the running
one. Either the Compose pin changed (revert it or do the reviewed migration in
[Rollback and recovery](rollback-and-recovery.md#database-image-or-volume-problems)), or a floating tag moved. Third-party
images are pinned to exact versions for this reason.

## Routes and TLS

| Symptom                                        | Cause                                                                     | Fix                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 404 on one path, others work                   | The service's Traefik labels or network are wrong                         | Check labels and that the container is on `public-network` (`docker inspect`); router names must match `kreditozrouti-<svc>-<PROJECT>`                                |
| 526 from Cloudflare                            | No valid origin certificate yet                                           | `docker logs traefik` (ingress host) for ACME errors; check the Cloudflare token (`CF_DNS_API_TOKEN`) and Full (strict) mode                                          |
| Dashboard returns 404                          | `TRAEFIK_DASHBOARD_ALLOWED_IPS` does not include your IP; it fails closed | Set the variable to your client IP or VPN CIDR and redeploy ingress                                                                                                   |
| CrowdSec bouncer not registered                | Registration step failed or LAPI was not ready                            | `docker exec crowdsec cscli bouncers list`; redeploy ingress (the post-deploy hook registers the snapshot's key)                                                      |
| Everything blocked after enabling the firewall | Origin firewall only admits Cloudflare ranges                             | `sudo nft list table inet cloudflare_origin`; add extra sources to `EXTRA_ALLOWED_V4/V6`; remove with `sudo nft delete table inet cloudflare_origin` as a last resort |

Ingress details are in [`deployment/ingress/`](../../deployment/ingress/). Public routes and DNS: [DNS and HTTPS](../setup/DNS.md).

## Monitoring

If dashboards are empty, inspect `docker ps --filter label=com.docker.compose.project=kreditozrouti-monitoring` and Alloy's logs,
then check the Docker socket group, the scrape labels, the monitoring network and the Compose project name. If Faro or Umami
data is missing, verify the browser's `VITE_*` settings and the `/faro/collect` or `/stats/stats.js` route on the relevant app
domain ([Secrets and config](secrets-and-config.md#web-runtime-settings)). A crash-looping Umami database after an image upgrade
is a volume-layout problem: diagnose before changing anything
([Rollback and recovery](rollback-and-recovery.md#database-image-or-volume-problems)). What the stack collects:
[Monitoring](../architecture/MONITORING.md).

## Backups and timers

| Symptom                              | Fix                                                                                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Healthchecks alert, no run           | `systemctl list-timers 'toolkit-kreditozrouti-*'` - timers are never enabled by install; [enable them](fresh-server.md#8-activate-recovery-and-schedules-vps-as-root) |
| Run failed                           | `journalctl -u toolkit-kreditozrouti-backup@4h.service -n 200`; the producer error is in the log                                                                      |
| `check` says stale                   | `deployment/toolkit backup list <component>`; runs are failing, see above                                                                                             |
| Doctor reports legacy pre-0.11 units | [Toolkit host guide](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md#migrating-a-host-from-010-or-older)                                                       |

The full backup debugging table is in the [Toolkit backups guide](https://github.com/H7KZ/Toolkit/tree/main/docs/backups.md#debug).

## Verify

The symptom is gone, `deployment/toolkit doctor` has no `fail` lines, and the public health URLs return 200.
