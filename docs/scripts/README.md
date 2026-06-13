# Scripts — Overview

Manual server management scripts. All scripts in `scripts/` source `lib.sh` for shared logging and Docker utilities.
Automated deployment scripts live in `deployment/` instead.

---

## Scripts

| Script              | Purpose                                                                           | Requires Root |
|---------------------|-----------------------------------------------------------------------------------|---------------|
| `lib.sh`            | Shared utilities (logging, `validate_files`, `create_networks`, `create_volumes`) | No            |
| `install-docker.sh` | Install Docker Engine on Ubuntu/Debian — run once on a fresh server               | Yes (`sudo`)  |
| `backup.sh`         | MySQL dump via docker exec — run manually or via cron                             | No            |
| `maintenance.sh`    | System maintenance (apt, cleanup, security, health)                               | Yes (`sudo`)  |
| `docker-cleanup.sh` | Clean unused Docker resources                                                     | No            |
| `clone-db.sh`       | Clone MySQL DB between dev and prod stacks on the same VPS                        | Yes (`sudo`)  |

---

## `lib.sh`

Shared library sourced by all other scripts. Not executable on its own.

**Source pattern:**

```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

**Provides:**

- Color variables: `RED`, `GREEN`, `YELLOW`, `BLUE`, `CYAN`, `DIM`, `NC`
- `log <msg>` — blue timestamp prefix
- `log_success <msg>` — green timestamp prefix
- `log_warning <msg>` — yellow timestamp prefix
- `log_error <msg>` — red timestamp prefix, writes to stderr
- If `LOG_FILE` is set before the first log call, all output is also teed to that file
- `validate_files <file...>` — exits 1 with a clear error if any listed file is missing
- `create_networks <networks.yml>` — creates external Docker networks that don't already exist
- `create_volumes <volumes.yml>` — creates Docker volumes that don't already exist

---

## Further Reading

- [Infrastructure scripts](INFRASTRUCTURE.md) — install-docker, github-runner (deployment/github-runner/deploy.sh)
- [Maintenance scripts](MAINTENANCE.md) — maintenance, docker-cleanup, clone-db
