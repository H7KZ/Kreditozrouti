# Kreditozrouti backups

Plain encrypted dumps to an Object-Locked Backblaze B2 bucket (`kreditozrouti-backups`) using the generic
`toolkit backup` command (pinned in `../toolkit.lock`). This directory only says what to back up.
Design: [Infrastructure backup plan](https://github.com/H7KZ/Infrastructure/blob/main/docs/plans/2026-10-backup-redesign.md).
Restore: [RESTORE.md](RESTORE.md).

| File                                                                       | Purpose                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `components.sh`                                                            | `mysql`, `umami-postgres` and `redis` (whole RDB), all every 4 h                                                  |
| `toolkit-backup@.service`, `toolkit-backup@kreditozrouti-{4h,daily}.timer` | Systemd units; UTC schedules at :35 (Ohlidame :15, Infrastructure :55); the Sunday daily run also fills `weekly/` |
| `install-backup.sh`                                                        | Installs pinned tools, the component list and units; never enables timers or writes credentials                   |
| `drill.sh`                                                                 | Restore drill used by `.github/workflows/backup-verify.yml`                                                       |

Redis is backed up whole, but only `share:*` and `ical:*` are ever restored (see RESTORE.md). Queues, cache, sessions
and counters are never restored.

## Host setup (owner, once)

1. Install the pinned toolkit (`sudo bash deployment/install-toolkit.sh`, then `toolkit activate <version>`).
2. `sudo bash deployment/backups/install-backup.sh` (installs pinned `age`/`rclone`, `zstd`, the component list, units).
3. Create `/etc/toolkit/backup/kreditozrouti.env`, root-owned, mode `0600`:

    ```
    BACKUP_BUCKET=kreditozrouti-backups
    BACKUP_B2_KEY_ID=<writer key id>
    BACKUP_B2_KEY=<writer key>
    BACKUP_AGE_RECIPIENT=<age1... public key>
    BACKUP_COMPONENTS_FILE=/usr/local/libexec/kreditozrouti-backup/components.sh
    BACKUP_HC_4H_URL=<Healthchecks ping URL>
    BACKUP_HC_DAILY_URL=<Healthchecks ping URL>
    ```

    The writer key has only `listBuckets,writeFiles`. Never put the age private key, a reader key or an admin key on the VPS.

4. `sudo toolkit backup run kreditozrouti daily`, then inspect the objects.
5. After owner go-ahead: `sudo systemctl enable --now toolkit-backup@kreditozrouti-4h.timer toolkit-backup@kreditozrouti-daily.timer`

## GitHub (verification)

Repository variable `BACKUP_BUCKET`; secrets `BACKUP_B2_READER_KEY_ID`, `BACKUP_B2_READER_KEY`
(`listBuckets,listFiles,readFiles`), `BACKUP_AGE_IDENTITY`, `BACKUP_HC_FRESHNESS_URL`, `BACKUP_HC_DRILL_URL`.

Capture holds only the `kreditozrouti/production` toolkit lock (waits up to 30 minutes), never the host lock, and releases it
before upload. Detection budget is 14 days (Object Lock).
