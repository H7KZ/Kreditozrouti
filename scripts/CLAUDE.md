# Scripts — CLAUDE.md

> Full reference: [docs/dev/scripts/](../docs/scripts/README.md)

VPS-wide scripts (`install-docker.sh`, `maintenance.sh`, `docker-cleanup.sh`, `setup-swap.sh`) live in the
**Infrastructure** repo — this box shares one Docker daemon and one disk across every repo deployed to it,
so generic host upkeep is that repo's job. Reachable at `~/scripts/` on the VPS regardless of which repo
owns them.

---

## Scripts

| Script                   | Purpose                                                                   | Requires Root |
|--------------------------|---------------------------------------------------------------------------|---------------|
| `lib.sh`                 | Shared utilities — sourced by all scripts, not run directly               | No            |
| `clone-db.sh`            | Clone MySQL DB between dev and prod stacks on the same VPS                | Yes           |
| `sync-grafana-alerts.sh` | Delete Grafana alert rules orphaned from `rules.yml`, reload provisioning | No            |
| `check-em-dashes.sh`     | CI lint check (used by `_verify.yml`)                                     | No            |

---

## Critical Invariants

**Always source `lib.sh` first** in any new script:

```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

---

## Key Docs

| Topic                                                                      | Doc                                              |
|----------------------------------------------------------------------------|--------------------------------------------------|
| VPS-wide scripts (install-docker, maintenance, docker-cleanup, setup-swap) | `Infrastructure/scripts/CLAUDE.md`               |
| clone-db — all flags + examples                                           | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md) |
