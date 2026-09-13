# Handoff: umami-db crash-looping on postgres 18+

This document is the memory you don't have. Read it top to bottom before touching anything — it
assumes no other context. Written after debugging the identical failure on Ohlídáme's VPS; that
repo's `umami-db` volume turned out to hold no real data, so its fix is NOT directly transferable —
you must re-run the diagnosis here, because **this repo's volume may hold real analytics data**.

---

## 0. The symptom

`umami-db` (currently `postgres:18-alpine`, `deployment/monitoring/docker-compose.monitoring.yml:239`)
either:

- fails once with `initdb: error: directory "/var/lib/postgresql/data" exists but is not empty`, or
- crash-loops with:

```
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" ...
       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data
```

## 1. Root cause

The compose file pins:

```yaml
environment:
    - PGDATA=/var/lib/postgresql/data
volumes:
    - kreditozrouti-umami-postgres-volume:/var/lib/postgresql/data
```

`PGDATA` equals the mount point itself — the old, pre-18 flat layout. Since `postgres:18-alpine`,
the image's entrypoint scans several legacy locations (`/var/lib/postgresql`,
`/var/lib/postgresql/data`, `/var/lib/postgresql/*/docker`) for a stray `PG_VERSION` file and **refuses to start** if it
finds one outside the new `/var/lib/postgresql/<major>/docker` layout —
by design, so it never silently reinitializes over data it doesn't recognize (docker-library/postgres#1259). Every
restart re-triggers the same refusal: this is a permanent
block, not a transient error.

## 2. Diagnose before touching anything — do NOT assume this volume is empty

```bash
docker run --rm -v kreditozrouti-umami-postgres-volume:/v alpine ls -la /v
```

Two outcomes:

**A — flat pg16/pg17 cluster directly at the volume root** (`PG_VERSION`, `base/`, `pg_wal/`, etc.
listed directly, no version-numbered subdirectory): this is real Umami data from before the pg18
image bump. **Do not wipe it.** Go to §3 (migrate).

**B — empty, or only stray `16/`/`18/` subdirectories with no real cluster inside them** (check with
`cat /v/*/docker/PG_VERSION` and `du -sh /v/*` — a genuinely fresh empty cluster is ~30-40M; an
empty directory is a few KB): this is what Ohlídáme's volume turned out to be — no real data, safe
to wipe. Go to §4 (clean start).

**If unsure which case you're in, stop and ask** rather than guessing — wiping real analytics data
is unrecoverable, and there is no cost to spending five more minutes confirming.

## 3. Case A: real pg16/pg17 data — migrate, don't wipe

The Alpine postgres images each ship only ONE major version's binaries, so `pg_upgrade` isn't
directly available without a third-party dual-version image. The safe, dependency-free path is
`pg_dumpall` + restore:

1. Take the stack down (`umami` and `umami-db` at minimum) so nothing writes during the dump.
2. Dump the old cluster via an ephemeral container running the OLD major version's image, with the
   existing volume mounted at `/var/lib/postgresql/data` (its current, real layout):
   ```bash
   docker run --rm \
       -v kreditozrouti-umami-postgres-volume:/var/lib/postgresql/data \
       -v "$PWD/pg-migration":/dump \
       -e POSTGRES_USER=$UMAMI_DB_USER -e POSTGRES_PASSWORD=$UMAMI_DB_PASSWORD -e POSTGRES_DB=$UMAMI_DB_NAME \
       --entrypoint sh postgres:<OLD_MAJOR>-alpine -c '
           docker-entrypoint.sh postgres &
           pid=$!
           until pg_isready -U "$POSTGRES_USER" -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done
           pg_dumpall -U "$POSTGRES_USER" -h 127.0.0.1 > /dump/dumpall.sql
           kill "$pid"; wait "$pid" 2>/dev/null || true
       '
   ```
   Confirm `pg-migration/dumpall.sql` is non-trivially sized (not just schema boilerplate) before
   going further.
3. **Back up the volume as-is** (rename it or `docker volume create` + `cp -a` its contents to a
   `-pg-old` volume) before touching it further — this is your rollback point.
4. Recreate the volume empty, apply the compose change in §5, bring up `umami-db` fresh (this
   inits a new empty pg18 cluster at the new layout), then restore:
   ```bash
   docker run --rm \
       -v kreditozrouti-umami-postgres-volume:/var/lib/postgresql \
       -v "$PWD/pg-migration":/dump:ro \
       -e POSTGRES_USER=$UMAMI_DB_USER -e POSTGRES_PASSWORD=$UMAMI_DB_PASSWORD -e POSTGRES_DB=$UMAMI_DB_NAME \
       --entrypoint sh postgres:18-alpine -c '
           docker-entrypoint.sh postgres &
           pid=$!
           until pg_isready -U "$POSTGRES_USER" -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done
           psql -U "$POSTGRES_USER" -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -f /dump/dumpall.sql
           kill "$pid"; wait "$pid" 2>/dev/null || true
       '
   ```
5. Bring the full stack up, verify Umami loads and shows historical data, THEN (and only then)
   remove the `-pg-old` backup volume.

## 4. Case B: no real data — clean start

```bash
docker run --rm -v kreditozrouti-umami-postgres-volume:/v alpine sh -c 'rm -rf /v/*'
docker run --rm -v kreditozrouti-umami-postgres-volume:/v alpine ls -la /v   # confirm empty
```

Then apply §5 and redeploy — postgres 18 initializes a clean cluster with nothing to conflict with.

## 5. The compose fix (needed in both cases)

Replace the current `umami-db` block in `deployment/monitoring/docker-compose.monitoring.yml`:

```yaml
# before
environment:
    - PGDATA=/var/lib/postgresql/data
volumes:
    - kreditozrouti-umami-postgres-volume:/var/lib/postgresql/data

# after
volumes:
    - kreditozrouti-umami-postgres-volume:/var/lib/postgresql
```

Drop the `PGDATA` line entirely — mounting at `/var/lib/postgresql` (the parent, not `.../data`)
lets the 18+ image default `PGDATA` to `/var/lib/postgresql/18/docker` itself, which is the layout
the image actually expects going forward and avoids re-hitting this same wall on the next major
bump.

## 6. Why not just pin PGDATA to the old flat path forever?

That was Ohlídáme's first attempted fix and it does work **only** while the volume's real data
stays exactly flat at the mount root forever — it just papers over the layout mismatch instead of
adopting the layout the image wants. It also does not survive a scenario where anything (a stray
`initdb` attempt, a manual `docker run`, an old compose still deployed) ever writes fresh 18-layout
data into the SAME volume — the legacy-location scan in §1 fires again regardless of what `PGDATA`
is currently set to, because it checks the mount root string, not the env var. Moving to the real
`/var/lib/postgresql` mount is the only fix that doesn't reappear on the next incident.
