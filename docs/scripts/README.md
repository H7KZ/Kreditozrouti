# Scripts — Overview

Manual server management scripts. All scripts in `../../scripts` source `lib.sh` for shared logging and Docker
utilities. Automated deployment scripts live in `../../deployment` instead.

VPS-wide scripts (`install-docker.sh`, `maintenance.sh`, `docker-cleanup.sh`, `setup-swap.sh`) live in the
**Infrastructure** repo instead — this VPS shares one Docker daemon and one disk across every repo deployed to
it, so generic host upkeep is that repo's job, not this one's. Reachable at `~/scripts/` on the VPS regardless
of which repo owns them (a symlink Infrastructure's `sync-scripts.yml` keeps current).

---

## Scripts

| Script                   | Purpose                                                                           | Requires Root |
|--------------------------|-----------------------------------------------------------------------------------|---------------|
| `lib.sh`                 | Shared utilities (logging, `validate_files`, `create_networks`, `create_volumes`) | No            |
| `backup-mysql.sh`        | MySQL dump via docker exec, off-site replication, Prometheus metrics              | No            |
| `setup-automation.sh`    | Install systemd timer for the daily MySQL backup                                  | Yes (`sudo`)  |
| `clone-db.sh`            | Clone MySQL DB between dev and prod stacks on the same VPS                        | Yes (`sudo`)  |
| `sync-grafana-alerts.sh` | Delete Grafana alert rules orphaned from `rules.yml`, reload provisioning         | No            |
| `check-em-dashes.sh`     | CI lint check (used by `_verify.yml`)                                             | No            |

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

- [Infrastructure scripts](../../../Infrastructure/scripts/CLAUDE.md) — install-docker, maintenance, docker-cleanup,
  setup-swap, setup-automation
- [Maintenance scripts](MAINTENANCE.md) — backup-mysql, clone-db
