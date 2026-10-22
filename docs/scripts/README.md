# Repository scripts

The [`scripts/`](../../scripts/) directory holds repository-specific Bash utilities. Deployment code lives in [`deployment/`](../../deployment/).

| Script                   | Purpose                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `lib.sh`                 | Shared logging and Docker helpers sourced by scripts                                      |
| `clone-db.sh`            | Copy the MySQL database between VPS environments                                          |
| `sync-grafana-alerts.sh` | Retired legacy Grafana alert cleanup script; current alerts use Prometheus and Loki rules |
| `check-em-dashes.sh`     | Check repository text for prohibited em dashes                                            |

See [maintenance](MAINTENANCE.md) for database cloning and the [deployment runbooks](../runbooks/deploy-and-release.md) for app, monitoring and ingress deployment. Host-wide Docker and Traefik maintenance belongs to the separate Infrastructure repository.
