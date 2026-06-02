# Deployment — Docker Images

All three services use multi-stage Docker builds for lean production images. Images are stored in GitHub Container
Registry (GHCR).

---

## API Image

**Location:** `api/Dockerfile` — Base: `node:24-alpine`

**Build stages:**

```
Stage 1 (builder)
  ├── Install npm + dependencies (--frozen-lockfile)
  ├── Copy source
  └── tsc → dist/

Stage 2 (production)
  ├── Copy dist/ + node_modules from builder
  └── CMD ["node", "dist/api/src/index.js"]
```

**Exposes:** port 80  
**Migrations** run automatically on startup via `SQLService.migrateToLatest()`.

---

## Client Image

**Location:** `client/Dockerfile` — Base: `node:24-alpine` → `nginx:stable-alpine`

**Build stages:**

```
Stage 1 (builder)
  ├── Install npm + dependencies
  ├── Set placeholder env vars:
  │     VITE_API_URL=__VITE_API_URL_PLACEHOLDER__
  │     VITE_FARO_COLLECTOR_URL=__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__
  └── vite build → dist/

Stage 2 (production)
  ├── nginx:stable-alpine
  ├── Copy dist/ to /usr/share/nginx/html
  ├── Copy nginx.conf
  └── ENTRYPOINT docker-entrypoint.sh (replaces placeholders at startup)
```

### Runtime environment injection

Because Vite bakes env vars into the bundle at build time, the client image uses a placeholder-replacement trick to stay
environment-agnostic:

```bash
# docker-entrypoint.sh
find /usr/share/nginx/html -type f -name "*.js" -exec \
  sed -i \
    -e "s|__VITE_API_URL_PLACEHOLDER__|${VITE_API_URL}|g" \
    -e "s|__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__|${VITE_FARO_COLLECTOR_URL}|g" \
    {} \;
exec "$@"
```

**Benefit:** A single image works in both development and production without rebuilding.

---

## Scraper Image

**Location:** `scraper/Dockerfile` — Base: `node:24-alpine`

**Build stages:**

```
Stage 1 (builder)
  ├── Install npm + dependencies
  ├── tsc → dist/

Stage 2 (production)
  ├── Copy dist/ + node_modules
  └── CMD ["node", "dist/index.js"]
```

---

## Image Registry (GHCR)

**Registry:** `ghcr.io`

**Naming convention:**

```
ghcr.io/<owner>/<repo>/api:<tag>
ghcr.io/<owner>/<repo>/client:<tag>
ghcr.io/<owner>/<repo>/scraper:<tag>
```

**Tag conventions:**

| Environment | Tag pattern                | Example                   |
|-------------|----------------------------|---------------------------|
| Production  | `v*.*.*` / `latest`        | `v1.0.0`, `latest`        |
| Development | `dev-*.*.*` / `dev-latest` | `dev-1.0.0`, `dev-latest` |

**Login:**

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## Building Images Locally

```bash
# Build all images
make build-docker-images

# Test an image
docker run -p 40080:80 --env-file .env kreditozrouti-api
docker run -p 45173:80 -e VITE_API_URL=http://localhost:40080 kreditozrouti-client
docker run --env-file .env kreditozrouti-scraper
```
