# DNS and HTTPS setup

This repo attaches its containers to the shared Traefik network and declares hostname and path routers. The external **Infrastructure** repo owns Traefik, its Cloudflare DNS-01 certificate resolver, and the Cloudflare API token. Coordinate origin addresses and certificate changes there. See [deployment infrastructure](../deployment/INFRASTRUCTURE.md).

## Public records

Point the following names at the public HTTPS origin used by the shared Traefik instance. Use an `A` record for an IPv4 origin, an `AAAA` record only when that origin serves IPv6, or a suitable `CNAME` target. Keep HTTP/HTTPS records proxied through Cloudflare, matching this repo's Cloudflare-to-Traefik deployment. Cloudflare proxies eligible `A`, `AAAA`, and `CNAME` records; DNS-only records reveal their origin address or target. [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)

| Hostname | Repo route and expected outcome |
|----------|---------------------------------|
| `kreditozrouti.cz` | Production web at `/`, API at `/api`, MCP at `/mcp`, Faro at `/faro`, Grafana at `/grafana`, and analytics at `/stats`. |
| `dev.kreditozrouti.cz` | Development web at `/`, API at `/api`, MCP at `/mcp`, Faro at `/faro`, and analytics at `/stats`. |
| `umami.kreditozrouti.cz` | Umami's own web interface at `/`. |

The app and monitoring [Compose routers](../../deployment/production/docker-compose.production.yml) use these hosts, with the monitoring paths and Umami host in [monitoring Compose](../../deployment/monitoring/docker-compose.monitoring.yml). Set each environment's `DOMAIN` GitHub variable to its hostname; the [deploy workflow](../../.github/workflows/_deploy-service.yml) supplies it to Compose. API, MCP, Faro, Grafana, and stats are path routes, so they need no separate DNS names. `www` is not a declared host router in this repo; any `www` policy belongs with shared Traefik.

## TLS ownership

The app's routers request Traefik's `letsencrypt` resolver. The shared Infrastructure repo configures that resolver and its Cloudflare DNS API token. DNS-01 proves domain control through a temporary `_acme-challenge` TXT record; it does not require a permanent application record. [Let's Encrypt DNS-01](https://letsencrypt.org/docs/challenge-types/)

Keep Cloudflare's origin encryption in **Full (strict)** after the shared Traefik origin presents a valid certificate covering these hosts. That mode verifies the origin certificate; an invalid or missing certificate can produce a 526 error. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

## Verify the outcome

1. Confirm Cloudflare is authoritative for `kreditozrouti.cz` and the three records exist with proxying enabled. A public DNS lookup of a proxied host should return Cloudflare addresses, not the origin address. [Cloudflare nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [proxy status](https://developers.cloudflare.com/dns/proxy-status/)
2. Open `https://kreditozrouti.cz/`, `https://dev.kreditozrouti.cz/`, and `https://umami.kreditozrouti.cz/`. Confirm valid HTTPS and the expected app or interface. Check `https://kreditozrouti.cz/api/health` and `https://dev.kreditozrouti.cz/api/health` for API routing.
3. If HTTPS fails, inspect the shared Infrastructure deployment's Traefik certificate issuance and renewal status, Cloudflare DNS token access, and origin certificate before changing this repo's Compose labels. If a path fails while its host works, inspect the matching router and service rather than adding a DNS record.
