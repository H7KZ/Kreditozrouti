# Deployment — Docker Images

Four services ship as images: **api**, **client**, **scraper** and **mcp**. All four use multi-stage Docker builds
(`turbo prune` + pnpm) for lean production images. Images are stored in GitHub Container Registry (GHCR).

Every build stage starts from `node:22-alpine` and installs the build toolchain with
`npm install -g pnpm@11.8.0 turbo@2.10.11`. Both versions are pinned rather than floating, and the root `package.json`
pins `"turbo": "^2.10.11"` instead of `"latest"`, so a local build and an image build run the same turbo.

---

## API Image

**Location:** `../../api/Dockerfile` - Base: `node:22-alpine`

**Build stages:**

```
Stage 1 (base)       node:22-alpine + curl + pnpm@11.8.0 + turbo@2.10.11
Stage 2 (pruner)     turbo prune @kreditozrouti/api --docker
Stage 3 (installer)  pnpm install --frozen-lockfile (pruned lockfile only)
Stage 4 (builder)
  ├── pnpm turbo run build --filter=@kreditozrouti/api
  └── pnpm --filter=@kreditozrouti/api --prod deploy /app/deploy
Stage 5 (runner)
  ├── node:22-alpine + curl, non-root user `api`
  └── CMD ["node", "--require", "./dist/api/src/telemetry.js", "dist/api/src/index.js"]
```

**Exposes:** port 80  
**Healthcheck (compose):** `curl -f http://localhost:80/health` - `curl` is installed in the runner stage for this.  
**Migrations** run automatically on startup via `SQLService.migrateToLatest()`.

---

## Client Image

**Location:** `../../client/Dockerfile` - Base: `node:22-alpine` → `nginx:stable-alpine`

**Build stages:**

```
Stage 1 (base)       node:22-alpine + pnpm@11.8.0 + turbo@2.10.11
Stage 2 (pruner)     turbo prune @kreditozrouti/client --docker
Stage 3 (installer)  pnpm install --frozen-lockfile
Stage 4 (builder)
  ├── Set placeholder env vars (six VITE_* vars, see below)
  └── pnpm turbo run build --filter=@kreditozrouti/client
Stage 5 (runner)
  ├── nginx:stable-alpine
  ├── Copy dist/ to /usr/share/nginx/html
  ├── Copy nginx.conf → /etc/nginx/templates/default.conf.template
  └── Copy docker-entrypoint.sh → /docker-entrypoint.d/40-inject-env.sh (replaces placeholders at startup)
```

**Healthcheck (compose):** `wget --spider -q http://localhost:80`. The runner stage is `nginx:stable-alpine`, which
ships **no** `curl`; a `curl -f` healthcheck therefore always failed and the container was permanently reported
unhealthy. busybox `wget` is present in the nginx alpine image, so the check uses that instead.

### Runtime environment injection

Because Vite bakes env vars into the bundle at build time, the client image uses a placeholder-replacement trick to stay
environment-agnostic. The builder stage sets each `VITE_*` var to a placeholder token, and
`client/docker-entrypoint.sh` rewrites the tokens in the built JS with the container's real env values before nginx
starts:

| Build-time placeholder                    | Runtime env var           |
|-------------------------------------------|---------------------------|
| `__VITE_API_URL_PLACEHOLDER__`            | `VITE_API_URL`            |
| `__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__` | `VITE_FARO_COLLECTOR_URL` |
| `__VITE_APP_VERSION_PLACEHOLDER__`        | `VITE_APP_VERSION`        |
| `__VITE_APP_ENV_PLACEHOLDER__`            | `VITE_APP_ENV`            |
| `__VITE_UMAMI_WEBSITE_ID_PLACEHOLDER__`   | `VITE_UMAMI_WEBSITE_ID`   |
| `__VITE_UMAMI_SRC_PLACEHOLDER__`          | `VITE_UMAMI_SRC`          |

> **The trick only works while `turbo.json` declares these vars under the `build` task's `env` allowlist.** turbo 2 runs
> tasks in strict env mode: any variable not declared there is **removed** from the task environment, not merely left
> out of the cache key. With no allowlist, the six `VITE_*` vars set as `ENV` in `client/Dockerfile` never reached
> vite, so no placeholder tokens were baked into the bundle at all - Faro and Umami were silently disabled in
> production, the app version reported `unknown`, and the entrypoint's `sed` found nothing to replace. `VITE_API_URL`
> masked the breakage by falling back to `/api`. **Anyone adding a new `VITE_*` var must add it to `turbo.json` as
> well**, or it will be stripped the same way. Declaring them also puts them in the cache key, which matters
> independently: a bundle built with real values and one built with placeholders must not share a cache entry.

**Benefit:** A single image works in both development and production without rebuilding.

---

## Scraper Image

**Location:** `../../scraper/Dockerfile` - Base: `node:22-alpine`

**Build stages:**

```
Stage 1 (base)       node:22-alpine + curl + pnpm@11.8.0 + turbo
Stage 2 (pruner)     turbo prune @kreditozrouti/scraper --docker
Stage 3 (installer)  pnpm install --frozen-lockfile
Stage 4 (builder)
  ├── pnpm turbo run build --filter=@kreditozrouti/scraper
  └── pnpm --filter=@kreditozrouti/scraper --prod deploy /app/deploy
Stage 5 (runner)
  ├── node:22-alpine + Alpine system Chromium, non-root user `scraper`
  └── CMD ["node", "--require", "./dist/scraper/src/telemetry.js", "dist/scraper/src/index.js"]
```

No port is exposed - the scraper is a queue worker.

---

## MCP Image

**Location:** `../../mcp/Dockerfile` - Base: `node:22-alpine`

**Build stages:**

```
Stage 1 (base)       node:22-alpine + curl + pnpm@11.8.0 + turbo@2.10.11
Stage 2 (pruner)     turbo prune @kreditozrouti/mcp --docker
Stage 3 (installer)  pnpm install --frozen-lockfile
Stage 4 (builder)
  ├── pnpm turbo run build --filter=@kreditozrouti/mcp
  └── pnpm --filter=@kreditozrouti/mcp --prod deploy /app/deploy
Stage 5 (runner)
  ├── node:22-alpine + curl, non-root user `mcp`
  └── CMD ["node", "dist/index.js"]
```

**Exposes:** port 3000 (`MCP_PORT`)  
**Healthcheck (compose):** `curl -f http://localhost:3000/health`

---

## Image Registry (GHCR)

**Registry:** `ghcr.io`

**Naming convention:**

```
ghcr.io/<owner>/<repo>/api:<tag>
ghcr.io/<owner>/<repo>/client:<tag>
ghcr.io/<owner>/<repo>/scraper:<tag>
ghcr.io/<owner>/<repo>/mcp:<tag>
```

**Tag conventions:**

Each build produces a **short-SHA versioned tag** plus a **floating tag**:

| Environment | Versioned tag      | Floating tag | Example versioned |
|-------------|--------------------|--------------|-------------------|
| Production  | `${GITHUB_SHA::8}` | `latest`     | `a1b2c3d4`        |
| Development | `${GITHUB_SHA::8}` | `dev-latest` | `a1b2c3d4`        |

The versioned tag (`API_IMAGE_TAG`, `CLIENT_IMAGE_TAG`, `SCRAPER_IMAGE_TAG`, `MCP_IMAGE_TAG`) is what `deploy.sh` uses.
Each service gets its own tag variable so services can be deployed independently at different SHAs. For full-stack
deploys via `deploy-all.yml`, all four variables are set to the same SHA.

**Login:**

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## Third-Party Image Pinning

Every third-party image in every Compose file is pinned. Nothing runs on `:latest`.

| Image                                           | Used by                                                                                            |
|-------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `mysql:9`                                       | production, development, local                                                                     |
| `redis:8-alpine`                                | production, development, local                                                                     |
| `phpmyadmin:5.2.3-apache`                       | production, development, local                                                                     |
| `myoung34/github-runner:2.337.0`                | `deployment/github-runner`                                                                         |
| `prom/prometheus:v3`                            | `deployment/monitoring`, local                                                                     |
| `grafana/grafana:13.2`                          | `deployment/monitoring`, local                                                                     |
| `grafana/loki:3.7`                              | `deployment/monitoring`, local                                                                     |
| `grafana/alloy:v1.19.2`                         | `deployment/monitoring`, local (no floating `v1` tag is published, so the exact version is pinned) |
| `ghcr.io/umami-software/umami:postgresql-v2.16` | `deployment/monitoring`                                                                            |
| `postgres:16-alpine`                            | `deployment/monitoring` (Umami DB, already pinned)                                                 |

**Policy:** pin the major (or major/minor) tag, never `:latest`. Every deploy runs `docker compose pull`, so a floating
tag can silently carry a stateful service across a major version, and for a database that is not reversible.

**Why not digests:** this repo has no Renovate or Dependabot. A digest pin would have to be bumped by hand on every
upstream patch release, so it would rot and quietly freeze images on old, unpatched builds. A major/minor tag still
picks up patch fixes on `pull` while blocking the breaking jump.

**MySQL caveat.** Oracle moved MySQL to calendar versioning, so `mysql:latest` now resolves to MySQL **26.x**. The pin
is `mysql:9`. MySQL refuses to start against a data directory initialised by a newer major, so a silent jump takes the
database down with no way back short of a restore. Before any deploy that changes this pin, confirm what is actually
running on the host:

```bash
docker compose exec mysql mysql --version
```

If it reports a major above 9, raise the pin to match rather than deploying.

---

## Building Images Locally

```bash
# Build all four images
make build-docker-images

# Test an image
docker run -p 40080:80 --env-file .env kreditozrouti-api
docker run -p 45173:80 -e VITE_API_URL=http://localhost:40080 kreditozrouti-client
docker run --env-file .env kreditozrouti-scraper
docker run -p 3000:3000 --env-file .env kreditozrouti-mcp
```
