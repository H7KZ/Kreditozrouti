# Scripts - AGENTS.md

> Full reference: [docs/scripts/](../docs/scripts/README.md)

VPS-wide scripts (`install-docker.sh`, `maintenance.sh`, `docker-cleanup.sh`, `setup-swap.sh`) live in the
**Infrastructure** repo - this box shares one Docker daemon and one disk across every repo deployed to it,
so generic host upkeep is that repo's job. Reachable at `~/scripts/` on the VPS regardless of which repo
owns them.

---

## Scripts

| Script                      | Purpose                                                                                                 | Requires Root |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| `clone-db.sh`               | Clone MySQL DB between dev and prod stacks on the same VPS                                              | Yes           |
| `migrate-infrastructure.sh` | One-off: dump Infrastructure state on the old VPS, restore on the new one                               | Yes           |
| `migration-lint.mjs`        | CI: fails when a new migration's `up()` drops, renames or modifies (migrations only add; rollback-safe) | No            |

`clone-db.sh` is standalone and takes no repository lock: do not start a deploy while it runs.

---

## Critical Invariants

**Every script is standalone.** No sourcing of sibling files and no shared `lib.sh`. Copy the four log helpers into the script, prefixed with `SCRIPT_NAME`:

```bash
log() { echo "[$SCRIPT_NAME] $*"; }
log_success() { echo "[$SCRIPT_NAME] OK: $*"; }
log_warning() { echo "[$SCRIPT_NAME] WARNING: $*" >&2; }
log_error() { echo "[$SCRIPT_NAME] ERROR: $*" >&2; }
```

**Every shell script must pass `shellcheck -x -P SCRIPTDIR`** (CI, `_verify.yml`). Declare and assign separately so
`set -e` sees command failures (SC2155).

---

## Key Docs

| Topic                                                                      | Doc                                |
| -------------------------------------------------------------------------- | ---------------------------------- |
| VPS-wide scripts (install-docker, maintenance, docker-cleanup, setup-swap) | `Infrastructure/scripts/CLAUDE.md` |

Historical deployment migration scripts fail closed; use a reviewed owner procedure.
