# Ingress (standalone mode)

This repository's own Traefik reverse proxy with automatic TLS, a read-only Docker socket proxy and CrowdSec (IDS and
in-line WAF). It is a copy of the canonical stack in the Infrastructure repository (`traefik/`), deployed as the toolkit
target `ingress` (compose project `global`) by the **Deploy Ingress** workflow.

**Use it only on a server without Infrastructure's Traefik.** Both bind ports 80/443 and own the network `public-network`;
never run two on one host. `prepare.sh` aborts when another container already publishes those ports from a different
release directory. Choosing the mode and the whole bring-up: [Fresh server](../../docs/runbooks/fresh-server.md);
decision record: [ADR 0006](../../docs/adr/0006-repository-standard-and-ingress-modes.md).

```
Internet -> Cloudflare -> :443 -> Traefik -> your containers (public-network)
                                    |
                          +---------+---------+
                          v                   v
                    socket-proxy          CrowdSec
```

| Path                                | What                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docker-compose.ingress.yml`        | socket-proxy, traefik, crowdsec                                                                    |
| `networks.yml`, `volumes.yml`       | External networks and volumes, created by `prepare.sh` (toolkit only creates `kreditozrouti-*`)    |
| `config/traefik.yml`                | Static config **template**; rendered to `.rendered/traefik.yml` at staging                         |
| `config/dynamic/`                   | Middlewares, TLS options, catch-all deny router (hot-reloaded)                                     |
| `crowdsec/`                         | Acquisition, profiles, config overlay, parser                                                      |
| `prepare.sh`, `post-deploy.sh`      | Toolkit hooks: render config and secrets, create resources; register the bouncer, wait for health  |
| `cloudflare-firewall.sh`            | Restricts 80/443 to Cloudflare ranges (nftables). Enabled via `toolkit.conf` on a dedicated server |
| `logrotate/traefik`                 | Rotates the access log                                                                             |
| `tests/test-cloudflare-firewall.py` | Exercises the real firewall in network namespaces (needs root on Linux)                            |

Edit `config/traefik.yml`, never `.rendered/`, which is generated per release into private runtime storage. Settings the
workflow supplies are listed in [Secrets and config](../../docs/runbooks/secrets-and-config.md#ingress-ingress-standalone-servers-only).
The stack shares its design and pins with Infrastructure's `traefik/`: when one changes deliberately, port the change.

## Notes

- **The dashboard fails closed.** `TRAEFIK_DASHBOARD_ALLOWED_IPS` must contain your real client IP or VPN range.
- **CrowdSec fails open.** Availability beats failing closed on a single box.
- **Back up `traefik-certificates-volume`** if reissuing certificates would hit rate limits; it holds the ACME account key.
- Verify the WAF after deploying: `docker exec crowdsec cscli bouncers list` shows `traefik`, and
  `docker exec crowdsec cscli metrics` shows lines read.
