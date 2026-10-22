---
status: accepted
date: 2026-10-22
---

# This repository follows the shared repository standard and can run its own ingress

Infrastructure, Ohlidame, Kreditozrouti and PortfolioV7 deploy with one pinned toolkit and had drifted in workflow
names, inputs, action pins and docs. The Toolkit repository now owns a
[repository standard](https://github.com/H7KZ/Toolkit/blob/main/docs/standard.md) that all of them follow, checked by
`npm run check:consumers` there. Kreditozrouti adopts it in full: identical dispatch inputs, SHA-pinned actions kept
current by Dependabot, least-privilege permissions, and the runbook set in [docs/runbooks](../runbooks/).

## Ingress is a role, not a dependency

Until now this repository only worked on a host where Infrastructure had already deployed Traefik and created
`public-network`. A repository must deploy to a clean server from its own checkout, so it now ships
[`deployment/ingress/`](../../deployment/ingress/): the same Traefik, docker-socket-proxy and CrowdSec stack
(compose project `global`, network `public-network`, same Traefik label contract), released through a fourth toolkit
target `ingress` by the **Deploy Ingress** workflow. Two modes:

- **Shared** (today's production host): Infrastructure's Traefik runs on the host. This repository does not deploy
  its ingress. Apps attach to `public-network` as before.
- **Standalone**: this repository deploys its own ingress first, then the app targets. Used on a dedicated server.

Apps never change between modes, because both name the network `public-network` and use the same labels.

## Consequences

- Never run both ingress stacks on one host: ports 80/443 clash. The workflow warns, and the ingress release hook
  refuses to stage when another container already publishes 80/443 from a different release directory.
- Toolkit creates only `kreditozrouti-*` networks and volumes itself. The ingress hook creates `public-network`, its
  private networks and its volumes under their Infrastructure-compatible names, so data and the access log
  (read by the monitoring stack) move between modes unchanged. The monitoring hook creates `traefik-logs-volume`
  if no ingress has run yet. No runbook step creates a network or volume by hand.
- Host-wide singletons (`MAINTENANCE_AT`, the Cloudflare origin firewall as `RECONCILE_BEFORE`) belong to exactly one
  repository per host. They stay commented out in `deployment/toolkit.conf` here and are enabled only on a
  standalone server ([split to own server](../runbooks/split-to-own-server.md)).
- The ingress copy can drift from Infrastructure's. Infrastructure's `traefik/` stays the canonical source; port
  changes deliberately in both places.
