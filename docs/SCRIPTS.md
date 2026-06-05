# Scripts — Index

> **Split documentation lives in [`docs/scripts/`](scripts/README.md).** This file is a navigation index.

| Document                                                   | Contents                               |
|------------------------------------------------------------|----------------------------------------|
| [**scripts/README.md**](scripts/README.md)                 | Overview table, `lib.sh` utilities     |
| [**scripts/INFRASTRUCTURE.md**](scripts/INFRASTRUCTURE.md) | install-docker, traefik, github-runner |
| [**scripts/MAINTENANCE.md**](scripts/MAINTENANCE.md)       | maintenance, docker-cleanup            |

## scrape.sh — Manual Scrape Trigger

Fires an InSIS scrape job via the API command endpoint.

```bash
./scripts/scrape.sh <API_URL> <MODE> <JOB> <TOKEN>
```

| Argument  | Values                                    |
|-----------|-------------------------------------------|
| `API_URL` | `http://localhost:40080` or prod URL      |
| `MODE`    | `turbo` \| `normal` \| `polite`           |
| `JOB`     | `catalog` \| `studyplans`                 |
| `TOKEN`   | Value of `COMMAND_TOKEN` env var          |

**Modes:**

| Mode     | Use case                                    |
|----------|---------------------------------------------|
| `turbo`  | Night runs only — no delays, max speed      |
| `normal` | Off-hours manual trigger                    |
| `polite` | Daytime — human-like pacing, safe for InSIS |

**Examples:**

```bash
# Daytime polite scrape (safe for production during business hours)
./scripts/scrape.sh https://api.kreditozrouti.cz polite catalog mytoken

# Fast scrape for dev or off-hours
./scripts/scrape.sh http://localhost:40080 turbo studyplans mytoken
```

**Makefile shortcuts** (default URL = `http://localhost:40080`, mode = `polite`):

```bash
make scrape-catalog           COMMAND_TOKEN=mytoken
make scrape-catalog-normal    COMMAND_TOKEN=mytoken
make scrape-catalog-turbo     COMMAND_TOKEN=mytoken
make scrape-studyplans        COMMAND_TOKEN=mytoken
make scrape-studyplans-normal COMMAND_TOKEN=mytoken
make scrape-studyplans-turbo  COMMAND_TOKEN=mytoken

# Override URL for prod:
make scrape-catalog API_URL=https://api.kreditozrouti.cz COMMAND_TOKEN=mytoken
```
