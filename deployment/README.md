# deployment/

Everything that deploys Kreditozrouti to a VPS. The procedures are in [docs/runbooks](../docs/runbooks/README.md); this file
only maps the directory.

| Path                                                                            | What                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `toolkit`, `toolkit.lock`, `vendor/toolkit/`                                    | The pinned toolkit release. Managed: never edit; repin from a Toolkit checkout (`npm run repin`)              |
| `toolkit.conf`                                                                  | Our integration: release targets, backup schedule, commented host-wide singletons                             |
| `production/`, `development/`                                                   | Compose model per application environment (`networks.yml`, `volumes.yml`, `docker-compose.<env>.yml`)         |
| `ingress/`                                                                      | Standalone-mode Traefik + CrowdSec stack, its hooks and the Cloudflare origin firewall script                 |
| `backup/components.sh`                                                          | What the toolkit backs up and how it drills it                                                                |
| `render-env.sh`, `package-release.py`, `resolve-release.py`, `release-notes.py` | CI helpers: dotenv rendering, release archive and manifest, source and image resolution, GitHub Release notes |

Read first: [Deploy and release](../docs/runbooks/deploy-and-release.md), [Rollback and recovery](../docs/runbooks/rollback-and-recovery.md),
[Fresh server](../docs/runbooks/fresh-server.md). Toolkit mechanics: [consumer guide](https://github.com/H7KZ/Toolkit/tree/main/docs/consumers.md),
[host guide](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md), [commands](https://github.com/H7KZ/Toolkit/tree/main/docs/commands.md).

Monitoring is Infrastructure's shared stack ([Monitoring](../docs/architecture/MONITORING.md)); this repository ships none.
No host deployment, migration or timer activation is implied by repository checks.
