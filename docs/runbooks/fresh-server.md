# Fresh server

Use this to take a brand-new Ubuntu 26.04 amd64 VPS from empty to a running Kreditozrouti: first deployment, moving to a
new VPS, or rebuilding after a loss. Do the steps in order. Every step says where it runs:

- **local** - your workstation
- **GitHub** - the repository settings or Actions tab
- **VPS as root** - an SSH session as a sudo-capable admin (commands start with `sudo` or run in `sudo -i`)
- **VPS as deploy** - an SSH session as the `deploy` user

Immutable releases are the only deployment mode, so there is no "manual first deploy": after step 3 everything goes
through GitHub Actions. Secret and variable **names** are in [Secrets and config](secrets-and-config.md); never paste
values into a shell history, a ticket or a commit.

## 0. Choose the ingress mode

Ingress (Traefik, CrowdSec, the Cloudflare origin firewall) is a role. Exactly one stack may own ports 80/443 on a host.

| Mode           | When                                                                                                 | What you deploy                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Shared**     | The host also runs the [Infrastructure](https://github.com/H7KZ/Infrastructure) repository's Traefik | Nothing for ingress. Deploy Infrastructure's `traefik` stack first, then this repository. |
| **Standalone** | This repository is the only (or the first) thing on the host                                         | **Deploy Ingress** from this repository, first.                                           |

**Never deploy this repository's ingress on a host where Infrastructure's Traefik runs.** Both bind 80/443 and own
`public-network`. The ingress hook aborts when it finds another publisher of those ports, but do not rely on it. Moving
a host from one mode to the other: [Split to own server](split-to-own-server.md).

Apps attach to the external network `public-network` and use the same Traefik labels in both modes, so nothing below the
ingress step differs.

## 1. Accounts and DNS (before touching the server)

- **Cloudflare:** the `kreditozrouti.cz` zone with proxying on. Standalone mode also needs a scoped API token
  (`Zone:DNS:Edit` on that zone) for the DNS-01 certificate challenge, and a hostname for the Traefik dashboard.
- **Backblaze B2:** the bucket, writer key (for the VPS), reader key (for GitHub verification) and the offline age
  identity. If they exist already (moving servers) keep them; otherwise follow [Backups](backups.md#set-up-a-new-bucket).
- **Healthchecks.io:** the four backup checks and the Watchdog check. Reuse the existing URLs.
- **GHCR images:** a deployment reuses already built images. They exist if the old deployment ran
  ([Deploy and release](deploy-and-release.md#modes)).
- **Recovery kit (offline):** age identity, B2 keys, Healthchecks URLs, and every value listed in
  [Secrets and config](secrets-and-config.md). Restoring uses the **original** values for secrets the data depends on.

## 2. Host preparation (VPS as root)

Create the deploy user, install the packages the toolkit needs and install Docker. The deploy account is
root-equivalent (Docker group plus the toolkit loader), so protect its SSH key accordingly.

```bash
sudo adduser --disabled-password --gecos '' deploy
sudo install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
echo '<deploy public key>' | sudo tee /home/deploy/.ssh/authorized_keys >/dev/null
sudo chown deploy: /home/deploy/.ssh/authorized_keys && sudo chmod 0600 /home/deploy/.ssh/authorized_keys

sudo apt-get update
sudo apt-get install -y git rsync python3 nftables curl ca-certificates logrotate
```

Install Docker Engine and the Compose plugin from Docker's apt repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker deploy
docker compose version
```

If Docker has no repository for this Ubuntu release yet, use `sudo apt-get install -y docker.io docker-compose-v2`
instead; the toolkit only needs a working Engine and the `docker compose` plugin.

Record the host key fingerprint for the `SSH_HOST_FINGERPRINT` secret, then harden SSH (key-only, no root login) while
keeping a second session open:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
printf 'PasswordAuthentication no
PermitRootLogin no
' | sudo tee /etc/ssh/sshd_config.d/10-hardening.conf >/dev/null
sudo sshd -t && sudo systemctl reload ssh
```

Test a new login as `deploy` (and your admin user) before closing the old session.

Optional host tuning (swap, bounded Docker logs) is a Toolkit feature:
[host configuration](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md#host-configuration-swap-docker-logs).

## 3. Install the pinned toolkit (VPS as deploy, then root)

The repository carries the toolkit release it deploys with. The checkout below is only for this one-time install and
for later pin changes; deploys never read it.

```bash
# VPS as deploy (a private repository needs a read-only deploy key or token for this clone)
git clone https://github.com/H7KZ/Kreditozrouti.git ~/kreditozrouti-checkout
cd ~/kreditozrouti-checkout
bash deployment/toolkit verify
```

```bash
# VPS as root
cd /home/deploy/kreditozrouti-checkout
sudo deployment/toolkit install --deploy-user deploy
```

Install places the bundle loader `/usr/local/libexec/toolkit-run-bundle` with the deploy user's only sudo rule, the
root-owned control copy `/opt/toolkit/kreditozrouti/`, the backup tools, and the systemd units declared in
[`deployment/toolkit.conf`](../../deployment/toolkit.conf). It enables nothing and touches no containers. Rerun it
after every toolkit pin change or change to a script `toolkit.conf` references. Mechanics:
[Toolkit host guide](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md).

Create the operator env file for backups now (see [Backups](backups.md#host-setup)) or after the first deploy; nothing
needs it until a backup runs.

## 4. GitHub secrets, variables and environments (GitHub)

1. Create the GitHub Environments `production`, `development`, `monitoring` and, for standalone mode, `ingress`.
2. Update the connection secrets (`SSH_HOST`, `SSH_PORT`, `SSH_PRIVATE_KEY`, `SSH_HOST_FINGERPRINT`, variable
   `SSH_USER`) to the **new** server.
3. Fill the per-environment secrets and variables exactly as listed in [Secrets and config](secrets-and-config.md).

If you are moving servers and the old one is still serving traffic, either create the new connection values in a
scratch copy of the secrets and swap them in at cutover, or accept that deploys go to the new host from this moment on.
A deploy dispatched while the secrets still name the old host deploys to the old host.

## 5. First deploy order (GitHub)

Run each from **Actions**, from the branch you want to ship. Wait for green before the next one.

1. **Ingress**
    - Standalone: **Deploy Ingress**, `operation=deploy`. It stages the stack as compose project `global`, renders the
      Traefik config, creates `public-network` and the Traefik/CrowdSec volumes, registers the CrowdSec bouncer and waits
      for health.
    - Shared: confirm Infrastructure's Traefik is healthy on the host
      (`docker ps --filter label=com.docker.compose.project=global`), and skip.
2. **Deploy** with `environment=production`, `operation=deploy`, `mode=promote` (leave `ref` and `run_id` empty to
   promote the latest qualified development release). If no qualified release exists, use `mode=reuse` with the `ref`
   whose images exist. Modes: [Deploy and release](deploy-and-release.md#modes).
3. **Deploy Monitoring**, `operation=deploy`.
4. **Deploy** with `environment=development` if you want the development environment on this host.

Toolkit creates the missing `kreditozrouti-*` networks and volumes itself during the first deploy of each environment.
`public-network` comes from the ingress step.

Verify on the host (**VPS as deploy**). While DNS still points at another server the public health check the toolkit
performs follows DNS, so check this host directly:

```bash
docker ps --filter label=com.docker.compose.project=kreditozrouti --format '{{.Names}} {{.Status}}'
curl -fsS --resolve kreditozrouti.cz:443:127.0.0.1 https://kreditozrouti.cz/api/health
curl -fsS --resolve kreditozrouti.cz:443:127.0.0.1 https://kreditozrouti.cz/mcp/health
ls -l ~/kreditozrouti/versions/production/current ~/kreditozrouti/versions/monitoring/current
```

An empty database is created on first start: the API runs migrations at startup. Continue with the restore in step 7
before sending users here.

## 6. Harden the host (standalone only)

In shared mode Infrastructure owns the Cloudflare origin firewall, log rotation and host maintenance; skip this step.
In standalone mode this repository does, and the lines are commented out in `deployment/toolkit.conf`:

1. **Local:** in `deployment/toolkit.conf` uncomment `MAINTENANCE_AT`, `RECONCILE_BEFORE` and the
   `cloudflare-firewall` job lines, set `JOBS=umami-retention cloudflare-firewall`, commit and let CI verify. See
   [Split to own server](split-to-own-server.md#enable-the-host-wide-singletons).
2. **VPS as deploy:** pull that revision in the checkout, then **VPS as root** reinstall the units and preview the rules:

    ```bash
    cd /home/deploy/kreditozrouti-checkout && git pull
    sudo deployment/toolkit install --deploy-user deploy
    sudo bash deployment/ingress/cloudflare-firewall.sh --dry-run
    sudo deployment/toolkit job cloudflare-firewall
    sudo install -m 0644 -o root -g root /home/deploy/kreditozrouti/versions/ingress/current/ingress/logrotate/traefik /etc/logrotate.d/traefik
    sudo systemctl enable --now toolkit-kreditozrouti-cloudflare-firewall.timer toolkit-maintenance.timer
    ```

The firewall is re-applied at every boot before containers are reconciled. SSH is not covered by it (only 80/443 are).

## 7. Restore data from B2 (restoring a previous deployment)

Skip this on a first-ever installation. Otherwise restore MySQL, the Umami database and the durable Redis keys using
[Backups: restore](backups.md#restore). Do it before DNS cutover, with production running but unannounced.

## 8. Activate recovery and schedules (VPS as root)

Only after steps 5 and 7 pass. Install never enabled anything; enabling is deliberate.

```bash
sudo systemctl start toolkit-kreditozrouti-reconcile.service     # manual reconcile first
sudo systemctl enable toolkit-kreditozrouti-reconcile.service
sudo deployment/toolkit backup run daily && sudo deployment/toolkit backup list
sudo systemctl enable --now toolkit-kreditozrouti-backup@4h.timer toolkit-kreditozrouti-backup@daily.timer
sudo deployment/toolkit job umami-retention
sudo systemctl enable --now toolkit-kreditozrouti-umami-retention.timer
deployment/toolkit doctor
```

Run the commands from `/home/deploy/kreditozrouti-checkout`. Check that Healthchecks received the backup ping.

## 9. Cut over and decommission the old VPS

When moving servers, in this order:

1. **Old VPS as root:** take a last backup and stop writers so nothing is captured twice:

    ```bash
    sudo deployment/toolkit backup run daily
    sudo systemctl disable --now toolkit-kreditozrouti-backup@4h.timer toolkit-kreditozrouti-backup@daily.timer
    ```

2. Restore that backup on the new server (step 7) if it is newer than the one you restored.
3. **Cloudflare:** point the `A` (and `AAAA` if used) records of `kreditozrouti.cz`, `dev.kreditozrouti.cz` and
   `umami.kreditozrouti.cz` at the new server. Lower the TTL a day earlier.
4. Check `https://kreditozrouti.cz/api/health`, `/mcp/health`, a scraper run, Grafana, and that **Backup Verify** is
   green from GitHub (run it manually, `check=both`).
5. Keep the old server stopped, not deleted, for a week. Then delete it and revoke the old deploy key and any old B2
   writer key.

## Verify the whole thing

```bash
deployment/toolkit doctor                     # VPS as deploy: no fail lines
systemctl list-timers 'toolkit-*'             # VPS: backup and job timers scheduled
```

Public health URLs return 200, **Backup Verify** is green, and a test rollback to `previous` works
([Rollback and recovery](rollback-and-recovery.md)).
