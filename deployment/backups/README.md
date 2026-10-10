# Production backups

This is the production capture and restore scaffold for Kreditožrouti. It backs up the MySQL catalog, Umami PostgreSQL
database, and Redis `share:*` / `ical:*` records. It does not include Redis queues, sessions, cache, counters, or the Redis
volume; it does not include Prometheus, Loki, Grafana, Alloy, or Stash state.

## Toolkit installation

From the repository checkout, verify and install the pinned toolkit inactive, then activate it explicitly:

```sh
sudo bash deployment/install-toolkit.sh
sudo /opt/toolkit/releases/<pinned-version>/bin/toolkit activate <pinned-version>
```

The helper checks the vendored archive against `deployment/toolkit.lock`. Keep the host toolkit version aligned with
this repository pin before deploying or capturing backups.

Install `capture.sh`, `restore.sh`, and `notify.sh` under `/usr/local/libexec/kreditozrouti-backup/` as root-owned
mode `0750` files before installing the reviewed systemd units. Keep the Kopia config and service environment
root-owned mode `0600` in a `0700` directory.

## Capture

`capture.sh --confirm-production` requires root, Docker, Python 3, the installed Infrastructure `toolkit`, a pinned Kopia
0.23.1 binary (version checked at runtime), a root-only Kopia repository config, and `KOPIA_PASSWORD` supplied through a
root-only service environment. `toolkit.lock` pins the expected host toolkit release. Every run uses the stable Kopia source `root@kreditozrouti-prod:/var/lib/kreditozrouti-backup/source`, regardless of its temporary staging directory.
The script captures MySQL with `mysqldump --single-transaction`, captures the Umami database in PostgreSQL custom format,
exports only the two durable Redis key families with their original absolute expiry times, and writes a manifest plus
SHA-256 checksums. Redis export is a bounded scan; each batch reads values and expiry atomically. Entries created during
the scan can be captured by this run or the next one.

The complete local set is written under `/var/lib/kreditozrouti-backup/staging/` while the Infrastructure toolkit holds
the host and `kreditozrouti/production` locks. Kopia upload starts after those locks have been released. Production
promotion copies the exact validated qualified development `release-manifest.json` into each promoted version
directory. Capture reads each running app container's Compose working directory, so rollback directories and partial
service promotions resolve to the manifest that directory deployed. It fails closed if a running app has no valid
source manifest, or if its service, source revision, or registry image digest does not match that manifest.

Each set contains a canonical `recovery-release-manifest.json` with deduplicated source manifests and hashes plus
service-keyed image bindings for every running app container, including its actual registry digests, Compose
configuration hash, source revision, and source manifest hash. Its configuration revision covers the release IDs,
toolkit bundle, source manifest hashes, and image bindings. The backup `manifest.json` records the canonical file's
SHA-256 in `recoveryDependencies.releaseManifestSha256` and in its file records. Restore checks both hashes, source
manifests, configuration revision, and live service bindings before staging the set. The backup manifest also records
the exact toolkit bundle pin, application/proxy operation IDs, and database image digests. If upload fails, the
checksummed local set stays available for
`capture.sh --upload-staged <backup-set-id>`. The uploader requires fail-fast snapshot creation and 100% Kopia file
verification before removing that local set.

The root-only Kopia config should connect through Backblaze's S3-compatible endpoint, with Object Lock configured when
creating the repository. Do not use Kopia's native Backblaze backend for Object Lock. Kopia documents S3-backed B2 object
locks and notes that its native B2 engine does not support them; the repository and lock period need explicit validation
before first use. [Kopia ransomware protection](https://kopia.io/docs/advanced/ransomware-protection/) ·
[Kopia S3 repository connection](https://kopia.io/docs/reference/command-line/common/repository-connect-s3/).

Kopia applies source retention during `snapshot create`. Provision all six counters (`keep-latest`, hourly, daily,
weekly, monthly, annual) as `0` and `ignore-identical-snapshots=false`; the script checks this policy before every upload.
In Kopia 0.23.1, all-zero counters retain every complete snapshot, so only the trusted hosted maintainer deletes reviewed
snapshot IDs after ten days. That maintainer tracks complete and restore-validated references, preserves last-good
material beyond ten days during failures, coordinates registry digest retention, and controls destructive expiry. Prove
these rules and B2 Object Lock behavior against disposable data before production use.

Set the source policy once from the same root-only Kopia environment used by the capture service:

```sh
kopia --config-file /etc/kreditozrouti-backup/repository.config policy set \
  'root@kreditozrouti-prod:/var/lib/kreditozrouti-backup/source' \
  --keep-latest=0 --keep-hourly=0 --keep-daily=0 --keep-weekly=0 \
  --keep-monthly=0 --keep-annual=0 --ignore-identical-snapshots=false
```

The root-only environment also carries `HEALTHCHECKS_BACKUP_URL` and `DISCORD_BACKUP_WEBHOOK_URL`. A successful upload
pings Healthchecks. The inactive systemd `OnFailure` unit sends a generic Discord alert and Healthchecks `/fail` ping.

Kopia's JSON snapshot result is stored root-only in `/var/lib/kreditozrouti-backup/results/`. Find the source and snapshot
IDs with `kopia snapshot list --all --json`; use a reviewed snapshot ID for restore. The create/list/restore command
options are documented at [snapshot create](https://kopia.io/docs/reference/command-line/common/snapshot-create/),
[snapshot list](https://kopia.io/docs/reference/command-line/common/snapshot-list/), and
[snapshot restore](https://kopia.io/docs/reference/command-line/common/snapshot-restore/).

## Restore

`/usr/local/libexec/kreditozrouti-backup/restore.sh <snapshot-id>` downloads to a new root-only directory under
`/var/lib/kreditozrouti-backup/restores/`, checks the manifest identity, canonical release-manifest binding, source
release digests, live service records, and every SHA-256 entry, then leaves the restored files staged. It never imports
into a database or changes a running service.

To rehearse Redis recovery, start an isolated Compose recovery project named `kreditozrouti-recovery` with an API
container pointed at its empty Redis service and a Compose-managed recovery Redis volume, then run:

```sh
sudo /usr/local/libexec/kreditozrouti-backup/restore.sh <snapshot-id> --restore-redis-to-api <recovery-api-container>
```

The helper requires exactly one running recovery Redis service, verifies its project-owned Docker volume, confirms the
API and Redis share a network, and pins the Redis connection to an address belonging to that Redis container. It refuses
to overwrite existing or concurrently-created share/calendar keys, skips already-expired entries, and restores every
other key with Redis `PXAT` using its original absolute expiry.
Do not repoint the API or recovery Compose project at production. Restore MySQL and Umami into fresh isolated database
instances from `mysql.sql` and `umami.dump`; do not use a production database name with an existing service.

## Operational gates

No systemd timer or scheduled GitHub workflow is installed or enabled by this change. The checked-in timer's four-hour
slot is staggered from the other repositories. Do not schedule capture until the
same toolkit locks wrap deployments and manual migrations, the root-only Kopia/B2 credentials and Object Lock policy are
configured, a full restore is rehearsed on an isolated host, and the application owner approves a maintenance window.
Kopia's writer applies source retention during snapshot creation. The capture policy must set all counters to `0` and
`ignore-identical-snapshots=false`, which the script checks before upload. In Kopia 0.23.1, all-zero counters retain all
complete snapshots; hosted maintenance explicitly deletes reviewed snapshot IDs after ten days and owns trusted
last-good/recovery references. It freezes deletion on capture or restore anomalies, protects last-good beyond ten days,
and coordinates registry digest retention. Keep permanent-delete credentials off the VPS. The recovery kit must live
outside it. Configure Discord alerts, an independent Healthchecks monitor, and operation status records before calling
the backup service operational.

Retention target: ten days, with the last known good recovery set protected until a later capture and restore validation
succeed. A four-hour capture cadence and four-hour recovery objective remain targets until observed capture durations
and isolated restore timings demonstrate them. Registry retention must keep every image digest referenced by an
unexpired or last-good recovery set.

## Clean-host recovery and timing evidence

Use only a clean host or fresh isolated volumes. Select a reviewed snapshot from the trusted recovery catalog; that
catalog is not implemented yet, so do not treat an uploader result alone as a trusted recovery reference. Provision the
supported host, install the exact toolkit bundle from the repository pin, recover B2/Kopia credentials and application
secrets from the password manager plus offline kit, then restore into fresh MySQL, PostgreSQL, and Redis targets.
Pull application and database images by manifest digest. Resolve the recorded application/proxy release IDs to their
source and Compose configuration, then verify the recorded Compose hashes before starting services. Until the complete
release manifest is published, stop recovery if those exact configurations cannot be resolved. Import MySQL and Umami
only into the fresh targets; restore Redis `share:*` and `ical:*` records through the isolated helper so original
absolute expirations are preserved. Restore runtime secrets, deploy the recorded application release, and keep public
ingress and external side effects disabled until checks pass.

Record UTC start/end times and result for host provisioning, key recovery, B2 access, snapshot verification/download,
each database import, Redis restore, digest-pinned image pulls, service readiness, share/iCal URL checks, external
ingress review, and final recovery approval. A four-hour recovery target is unproven until a clean-host rehearsal
completes within four hours and evidence is reviewed. GHCR deletion remains disabled until trusted backup references
and deployment rollback references are consumed together by a fail-closed retention job.
