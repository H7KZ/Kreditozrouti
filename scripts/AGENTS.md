# Scripts - AGENTS.md

> Full reference: [docs/scripts/](../docs/scripts/README.md)

VPS-wide scripts (`install-docker.sh`, `maintenance.sh`, `docker-cleanup.sh`, `setup-swap.sh`) live in the
**Infrastructure** repo - this box shares one Docker daemon and one disk across every repo deployed to it,
so generic host upkeep is that repo's job. Reachable at `~/scripts/` on the VPS regardless of which repo
owns them.

---

## Scripts

| Script                   | Purpose                                                                      | Requires Root |
| ------------------------ | ---------------------------------------------------------------------------- | ------------- |
| `lib.sh`                 | Shared utilities - sourced by all scripts, not run directly                  | No            |
| `clone-db.sh`            | Clone MySQL DB between dev and prod stacks on the same VPS                   | Yes           |
| `sync-grafana-alerts.sh` | Retired legacy Grafana cleanup script; current rules live in Prometheus/Loki | No            |
| `check-em-dashes.sh`     | CI lint check (used by `_verify.yml`)                                        | No            |

---

## Critical Invariants

**Always source `lib.sh` first** in any new script:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
```

**Every shell script must pass `shellcheck -x -P SCRIPTDIR`** (CI, `_verify.yml`). Declare and assign separately so
`set -e` sees command failures (SC2155).

---

## Key Docs

| Topic                                                                      | Doc                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| VPS-wide scripts (install-docker, maintenance, docker-cleanup, setup-swap) | `Infrastructure/scripts/CLAUDE.md`               |
| Database cloning and recovery                                              | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md) |

Database cloning always acquires the toolkit repository-wide lock and host window before reading either saved snapshot or changing data. Historical deployment migration scripts fail closed; use a reviewed owner procedure.
