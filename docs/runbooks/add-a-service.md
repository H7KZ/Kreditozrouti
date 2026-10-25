# Add a service or environment

Use this to add a container service to the application, to add a setting, or to add a whole environment. The deployed
model is: one Compose file set per environment under `deployment/<environment>/`, prebuilt images pinned by digest, and
Traefik discovering services by Docker labels on the external `public-network`. Nothing is built on the VPS.

## What exists

| Service | Runtime                   | Internal port | Health                           | Image source              |
| ------- | ------------------------- | ------------- | -------------------------------- | ------------------------- |
| API     | Node, non-root            | 80            | `GET /health`                    | `apps/api/Dockerfile`     |
| Web     | nginx                     | 80            | BusyBox `wget` on `127.0.0.1:80` | `apps/web/Dockerfile`     |
| Scraper | Node worker with Chromium | 9101 metrics  | Container and scrape checks      | `apps/scraper/Dockerfile` |
| MCP     | Node, non-root            | 3000          | `GET /health`                    | `apps/mcp/Dockerfile`     |

Dockerfiles are multi-stage: prune the Turbo workspace, install with the frozen pnpm lockfile, build, copy the output into
a runner image. The API runs database migrations at startup. The scraper serves `/metrics` only inside the monitoring
network and has no public route.

Networks and volumes (all external to Compose, declared in each environment's `networks.yml` / `volumes.yml`):

| Resource                                     | Used by                                                  | Created by                                |
| -------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `public-network`                             | Traefik, web, API, MCP, public monitoring routes         | The ingress stack (see below)             |
| `kreditozrouti-mysql-network-{prod,dev}`     | MySQL, API, MCP, phpMyAdmin                              | Toolkit, on first deploy                  |
| `kreditozrouti-redis-network-{prod,dev}`     | Redis, API, scraper                                      | Toolkit, on first deploy                  |
| `kreditozrouti-monitoring-network`           | API, scraper, Alloy                                      | Toolkit, on first deploy                  |
| `kreditozrouti-mysql-volume-prod`, `-redis-` | Persistent data, separate for dev                        | Toolkit, on first deploy                  |
| `kreditozrouti-*-volume` (monitoring)        | Prometheus, Loki, Grafana, Alloy, Alertmanager, Umami DB | Toolkit, on first deploy                  |
| `traefik-logs-volume`                        | Access log read by Alloy                                 | The ingress stack, or the monitoring hook |

Toolkit creates missing `kreditozrouti-*` networks and volumes itself, so none are created by hand. `public-network` is
owned by whichever ingress runs on the host: [Fresh server](fresh-server.md#0-choose-the-ingress-mode). Redis uses
append-only persistence and `noeviction`; retain its volume when redeploying.

## Add a service

1. **Image.** Add `apps/<name>/Dockerfile` (build context is the repository root) and list the service name where images are
   enumerated: `deployment/resolve-release.py` (`SERVICES`), `deployment/package-release.py` (`app_services`),
   `registry-cleanup.yml` (default packages), and the description in `_build.yml`.
2. **Workflow.** In `deploy.yml` add a `build-<name>` job, its `<name>_digest` output on `resolve` and the matching
   `needs`/`if` conditions of `deploy` and `publish-qualified-development-release`; in `_deploy.yml` add the
   `<name>_digest` input and pass it as `<NAME>_DIGEST` to the packet step. A release must always carry every service's
   digest together.
3. **Compose.** Add the service to `deployment/production/docker-compose.production.yml` and
   `deployment/development/docker-compose.development.yml` with
   `image: ${IMAGE_REGISTRY}/${IMAGE_PREFIX}/<name>${<NAME>_IMAGE_REFERENCE:-:${<NAME>_IMAGE_TAG:-latest}}`
   (toolkit pins the digest; the variables are set by `package-release.py`), a healthcheck, bounded logging and resource
   limits. Pin third-party images to an exact version tag, never `latest`.
4. **Routing.** Join `public-network` and set the Traefik labels (the same contract in every ingress mode):

    ```yaml
    labels:
        - 'traefik.enable=true'
        - 'traefik.http.routers.kreditozrouti-<name>-${PROJECT}.rule=Host(`${DOMAIN}`) && PathPrefix(`/<name>`)'
        - 'traefik.http.routers.kreditozrouti-<name>-${PROJECT}.entrypoints=websecure'
        - 'traefik.http.routers.kreditozrouti-<name>-${PROJECT}.tls=true'
        - 'traefik.http.routers.kreditozrouti-<name>-${PROJECT}.tls.certresolver=letsencrypt'
        - 'traefik.http.services.kreditozrouti-<name>-${PROJECT}.loadbalancer.server.port=<port>'
    ```

    Router names must match `kreditozrouti-(api|web|mcp)-<suffix>` for Alloy to select the service's metrics and access
    logs; changing the pattern needs a matching change in Infrastructure's `monitoring/alloy/kreditozrouti.alloy`. Add the route to the
    health URLs in `package-release.py` if it is user-facing, and to [DNS and HTTPS](../setup/DNS.md).

5. **Data.** Give a stateful service its own `kreditozrouti-<engine>-network-{prod,dev}` network and
   `kreditozrouti-<engine>-volume-{prod,dev}` volume in the environments' `networks.yml`/`volumes.yml`, and add a component
   to `deployment/backup/components.sh` ([Backups](backups.md)). A major-version change of a data image needs a reviewed
   migration ([Rollback and recovery](rollback-and-recovery.md#database-image-or-volume-problems)).
6. **Monitoring.** To expose metrics join `kreditozrouti-monitoring-network` and set `prometheus.io/scrape=true` and
   `prometheus.io/port=<port>` labels. Alloy keeps only the `kreditozrouti`, `kreditozrouti-dev` and
   `kreditozrouti-monitoring` Compose projects; see [Monitoring](../architecture/MONITORING.md).
7. **Verify.** `docker compose config` on every changed Compose file with dummy variables, `bash deployment/toolkit verify`,
   then **Deploy** to development and check the route.

## New environment variable

A value the application reads: add the GitHub secret or variable ([Secrets and config](secrets-and-config.md)), map it in
the `Build private incoming packet` step of `_deploy.yml`, write it in `deployment/render-env.sh` (`require` it if
mandatory) and reference it from the Compose `environment:`. A web `VITE_*` value is compiled as a placeholder and replaced
at container start: also add it to `apps/web/Dockerfile`, `apps/web/docker-entrypoint.sh` and `build.env` in the root
`turbo.json`.

## New environment

Copy `deployment/development/` to `deployment/<environment>/` (files `networks.yml`, `volumes.yml`,
`docker-compose.<environment>.yml`), give it its own `PROJECT`, network and volume suffixes and Compose project name, then
register it in four places: `RELEASE_TARGETS` in `deployment/toolkit.conf`, the allowed environments in
`deployment/package-release.py` and `deployment/render-env.sh`, the `Validate` and SSH regular expressions in `_deploy.yml`
and `rollback.yml`, and the `environment` choices of `deploy.yml` and `rollback.yml`. Create the GitHub Environment and run
`sudo deployment/toolkit install --deploy-user deploy` on the VPS to refresh the control copy.

## phpMyAdmin

**Development** starts phpMyAdmin automatically at `https://<DOMAIN>/phpmyadmin` behind Traefik basic auth
(`PHPMYADMIN_BASIC_AUTH`). It also binds `127.0.0.1:48081` as an SSH-tunnel fallback.

**Production** never exposes it: no route, loopback `127.0.0.1:48080` only, stopped under Compose profile `admin`. Start it
from the current snapshot with the Compose files listed in its `.toolkit-release.json`:

```bash
# VPS as deploy
cd ~/kreditozrouti/versions/production/current
docker compose -p kreditozrouti --env-file .env \
  -f production/networks.yml -f production/volumes.yml \
  -f production/docker-compose.production.yml --profile admin up -d phpmyadmin
# local
ssh -L 48080:127.0.0.1:48080 deploy@<host>        # then open http://localhost:48080
# VPS as deploy, when finished
docker compose -p kreditozrouti --env-file .env -f production/networks.yml -f production/volumes.yml \
  -f production/docker-compose.production.yml --profile admin stop phpmyadmin
```

Never publish the MySQL root credentials.

## Local Compose

The root [`docker-compose.local.yml`](../../docker-compose.local.yml) is developer-only and has its own pinned Traefik.
`make dev` starts only MySQL and Redis and runs the watchers on the host; `make up` builds and starts the four services
behind local Traefik (`/` web, `/api` API, `/mcp` MCP; dashboard at `http://localhost:8080/dashboard/`); `make admin` adds
phpMyAdmin. It has no monitoring services and nothing here changes it.

## Verify

`bash deployment/toolkit verify` passes, `docker compose config` accepts every Compose file, a development **Deploy**
finishes green and the new route answers.
