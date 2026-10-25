# DNS and HTTPS setup

This repo defines app and monitoring routes. Traefik, `public-network` and the Cloudflare DNS-01 certificate resolver come from the host's ingress: the Infrastructure repository on a shared host (coordinate origin and certificate changes there), or this repository's own [ingress](../../deployment/ingress/README.md) on a dedicated server ([Fresh server](../runbooks/fresh-server.md#0-choose-the-ingress-mode)).

## Records and routes

Point these names at the ingress origin with suitable `A`, `AAAA`, or `CNAME` records. Proxy HTTP and HTTPS traffic through Cloudflare. Add an `AAAA` record only if the origin serves IPv6. [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)

| Host                     | Routes declared here                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `kreditozrouti.cz`       | Web `/`, API `/api`, MCP `/mcp` and OAuth discovery, Faro `/faro`, Grafana `/grafana`, Umami tracker `/stats` |
| `dev.kreditozrouti.cz`   | Web `/`, API `/api`, MCP `/mcp` and OAuth discovery, Faro `/faro`, Umami tracker `/stats`                     |
| `umami.kreditozrouti.cz` | Umami interface `/`                                                                                           |

App routes come from the [production](../../deployment/production/docker-compose.production.yml) and [development](../../deployment/development/docker-compose.development.yml) Compose files; Faro and Umami `/stats` routes on the app domains come from Infrastructure's [monitoring stack](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/docker-compose.monitoring.yml); Grafana and the Umami admin are on `monitoring.jankominek.com` and `umami.jankominek.com`. Set each app environment's GitHub `DOMAIN` variable to its host. Path routes need no separate DNS records. This repo does not declare a `www` host router.

## TLS

The app asks Traefik for the `letsencrypt` certificate resolver. Whichever Traefik runs must configure it with Cloudflare DNS-01 access (`CF_DNS_API_TOKEN` for the own ingress); DNS-01 creates temporary `_acme-challenge` TXT records. [Let's Encrypt DNS-01](https://letsencrypt.org/docs/challenge-types/)

Use Cloudflare **Full (strict)** after Traefik presents a valid origin certificate for these hosts. An invalid origin certificate can produce HTTP 526. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

## Verify

1. Confirm Cloudflare is authoritative and the three records are proxied. A public lookup of a proxied host returns Cloudflare addresses. [Cloudflare nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
2. Open the three HTTPS hosts and check `https://kreditozrouti.cz/api/health` and `https://dev.kreditozrouti.cz/api/health`.
3. For certificate failure, inspect the Traefik resolver and Cloudflare token ([Troubleshooting](../runbooks/troubleshooting.md#routes-and-tls)). If the host works but one path fails, inspect that route's Compose labels and service.
