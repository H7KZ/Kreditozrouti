# DNS and HTTPS setup

This repo defines app and monitoring routes. The separate Infrastructure repo owns shared Traefik, `public-network`, and the Cloudflare DNS-01 certificate resolver. Coordinate origin and certificate changes there. See [deployment infrastructure](../deployment/INFRASTRUCTURE.md).

## Records and routes

Point these names at the shared Traefik origin with suitable `A`, `AAAA`, or `CNAME` records. Proxy HTTP and HTTPS traffic through Cloudflare. Add an `AAAA` record only if the origin serves IPv6. [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)

| Host | Routes declared here |
| --- | --- |
| `kreditozrouti.cz` | Web `/`, API `/api`, MCP `/mcp` and OAuth discovery, Faro `/faro`, Grafana `/grafana`, Umami tracker `/stats` |
| `dev.kreditozrouti.cz` | Web `/`, API `/api`, MCP `/mcp` and OAuth discovery, Faro `/faro`, Umami tracker `/stats` |
| `umami.kreditozrouti.cz` | Umami interface `/` |

App routes come from the [production](../../deployment/production/docker-compose.production.yml) and [development](../../deployment/development/docker-compose.development.yml) Compose files; Faro, Grafana, and Umami routes come from [monitoring Compose](../../deployment/monitoring/docker-compose.monitoring.yml). Set each app environment's GitHub `DOMAIN` variable to its host. Path routes need no separate DNS records. This repo does not declare a `www` host router.

## TLS

The app asks Traefik for the `letsencrypt` certificate resolver. The shared Traefik must configure it with Cloudflare DNS-01 access; DNS-01 creates temporary `_acme-challenge` TXT records. [Let's Encrypt DNS-01](https://letsencrypt.org/docs/challenge-types/)

Use Cloudflare **Full (strict)** after Traefik presents a valid origin certificate for these hosts. An invalid origin certificate can produce HTTP 526. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

## Verify

1. Confirm Cloudflare is authoritative and the three records are proxied. A public lookup of a proxied host returns Cloudflare addresses. [Cloudflare nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
2. Open the three HTTPS hosts and check `https://kreditozrouti.cz/api/health` and `https://dev.kreditozrouti.cz/api/health`.
3. For certificate failure, inspect the shared Traefik resolver and Cloudflare token. If the host works but one path fails, inspect that route's Compose labels and service.
