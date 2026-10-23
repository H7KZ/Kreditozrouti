# Repository scripts

The [`scripts/`](../../scripts/) directory holds repository-specific Bash utilities. Deployment code lives in [`deployment/`](../../deployment/).

| Script        | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| `clone-db.sh` | Copy the MySQL database between the dev and prod stacks on this VPS |

For app, monitoring and ingress deployment see the [deployment runbooks](../runbooks/deploy-and-release.md). Host-wide Docker and Traefik maintenance belongs to the separate Infrastructure repository.
