# Split to own server

Use this when Kreditozrouti moves to a server of its own, which then needs its own ingress and host-wide jobs, or when it
moves back onto a shared host. The mode decision itself is explained in
[ADR 0006](../adr/0006-repository-standard-and-ingress-modes.md) and
[Fresh server](fresh-server.md#0-choose-the-ingress-mode).

|                                                 | Shared host               | Own server (standalone)                                    |
| ----------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| Traefik, CrowdSec                               | Infrastructure repository | this repository, `deployment/ingress/`, **Deploy Ingress** |
| `public-network`                                | created by Infrastructure | created by the ingress hook                                |
| Cloudflare origin firewall (`RECONCILE_BEFORE`) | Infrastructure            | this repository (commented out until enabled)              |
| Host updates (`MAINTENANCE_AT`)                 | Infrastructure            | this repository (commented out until enabled)              |
| App, monitoring, backups                        | this repository           | this repository                                            |

Exactly one repository per host declares each host-wide singleton. If two do, the host gets two maintenance timers or two
competing firewall tables.

## Move to a dedicated server

1. Build the server with [Fresh server](fresh-server.md), choosing **standalone** in step 0. It covers the host, toolkit,
   secrets, ingress, first deploy, the restore from B2 and the DNS cutover.
2. Enable the host-wide singletons ([below](#enable-the-host-wide-singletons)) in the same pass (fresh-server step 6).
3. Leave the old shared host as it was: it keeps running Infrastructure's Traefik for the other repositories. Only remove this
   repository's containers from it after the new server serves traffic and a backup taken there has been verified.

## Enable the host-wide singletons

Only on a server where no other repository declares them. In `deployment/toolkit.conf` the lines are present, commented out:

```ini
# MAINTENANCE_AT=Sun *-*-* 03:30:00 UTC
# RECONCILE_BEFORE=deployment/ingress/cloudflare-firewall.sh
# JOB_CLOUDFLARE_FIREWALL_RUN=deployment/ingress/cloudflare-firewall.sh
# JOB_CLOUDFLARE_FIREWALL_AT=Mon *-*-* 04:00:00 UTC
# JOB_CLOUDFLARE_FIREWALL_ENVIRONMENT=infrastructure
# JOB_CLOUDFLARE_FIREWALL_HOST_WINDOW=true
```

1. **Local:** uncomment them and extend `JOBS=umami-retention` to `JOBS=umami-retention cloudflare-firewall`. Commit on a branch
   and let **Verify Code** pass. (`npm run check:consumers` in the Toolkit repository flags the singletons while they are
   active in an app repository; that is expected only on a repository that deliberately owns a server.)
2. **VPS as root:** pull the revision in `/home/deploy/kreditozrouti-checkout` and reinstall so the units are generated:

    ```bash
    cd /home/deploy/kreditozrouti-checkout && git pull
    sudo deployment/toolkit install --deploy-user deploy
    sudo bash deployment/ingress/cloudflare-firewall.sh --dry-run
    sudo deployment/toolkit job cloudflare-firewall
    sudo systemctl enable --now toolkit-kreditozrouti-cloudflare-firewall.timer toolkit-maintenance.timer
    ```

The firewall restricts ports 80/443 to Cloudflare ranges (SSH is untouched). Run `--dry-run` first and check that nothing
else needs direct access (add monitors to `EXTRA_ALLOWED_V4` / `EXTRA_ALLOWED_V6`). Maintenance runs `apt dist-upgrade`
under every repository lock; set `AUTO_REBOOT` deliberately in the host config. Log rotation for the Traefik access log:
`sudo install -m 0644 -o root -g root /home/deploy/kreditozrouti/versions/ingress/current/ingress/logrotate/traefik /etc/logrotate.d/traefik`.

## Move back onto a shared host (standalone to shared)

Causes a short ingress outage. Do it only when Infrastructure's Traefik is ready to take over: it uses the same volume and
network names, so certificates and CrowdSec state carry over.

1. **Local:** comment the singleton lines out again, commit, merge.
2. **VPS as root:** reinstall to remove the generated firewall and maintenance units, then free the ports:

    ```bash
    cd /home/deploy/kreditozrouti-checkout && git pull
    sudo deployment/toolkit install --deploy-user deploy
    docker rm -f traefik crowdsec socket-proxy
    sudo -u deploy rm -f /home/deploy/kreditozrouti/versions/ingress/current /home/deploy/kreditozrouti/versions/ingress/previous   # reconcile must not restart it
    ```

3. **GitHub:** run Infrastructure's **Deploy** for `traefik`. Check `docker ps --filter label=com.docker.compose.project=global`.
4. Check the application routes and delete the `ingress` GitHub Environment secrets.

## Monitoring on a separate host (not implemented)

Proposal only. Alloy currently reads the local Docker socket and Traefik log volume, discovers app containers, receives Faro
and pushes to local Prometheus and Loki. A split needs an app-host agent that keeps those links and ships metrics and logs to
the remote Prometheus/Loki over private networking, a Faro receiver reachable from the ingress, proxy routes for Grafana and
Umami, and a backed-up Umami database migration. Prometheus and Loki must stay private. Define authentication, firewall rules,
volume backup, failure behaviour and a rollback before changing any Compose file.

## Verify

The new server answers `https://kreditozrouti.cz/api/health`, `docker ps --filter label=com.docker.compose.project=global`
shows exactly one Traefik, `sudo nft list table inet cloudflare_origin` exists on a server that owns the firewall,
`systemctl list-timers 'toolkit-*'` lists the expected timers, and `deployment/toolkit doctor` has no `fail` lines.
