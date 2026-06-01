# Scripts — Infrastructure

Scripts for provisioning server infrastructure: Docker, Traefik, and GitHub Actions runners.

---

## `install-docker.sh`

Installs Docker Engine on Ubuntu 20.04+ / Debian 11+. Run once on a fresh server.

```bash
sudo ./install-docker.sh [--user <username>] [--skip-test]
```

**Steps:**

1. Removes conflicting old Docker packages
2. Installs prerequisites (`curl`, `gnupg`, etc.)
3. Adds Docker's official apt repository with GPG key
4. Installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`
5. Runs `docker run hello-world` to verify (skip with `--skip-test`)
6. Adds `$SUDO_USER` (or `--user`) to the `docker` group
7. Enables and starts the Docker systemd service

After install, log out and back in for group membership to take effect.

---

## `traefik.sh`

Deploys the global Traefik reverse proxy. Reads its compose config from `deployment/traefik/`.

```bash
./traefik.sh \
  --path ~/deployment \
  --domain traefik.example.com \
  --credentials ~/.htpasswd \
  --cf-email user@example.com \
  --cf-token CF_TOKEN
```

**Required flags:**

| Flag            | Description                                |
|-----------------|--------------------------------------------|
| `--path`        | Path to the deployment directory           |
| `--domain`      | Domain for the Traefik dashboard           |
| `--credentials` | Path to htpasswd file for basic auth       |
| `--cf-email`    | Cloudflare account email                   |
| `--cf-token`    | Cloudflare API token (`Zone → DNS → Edit`) |

**Env var equivalents:** `DEPLOYMENT_PATH`, `TRAEFIK_DOMAIN`, `TRAEFIK_CREDENTIALS_PATH`, `CF_API_EMAIL`,
`CF_DNS_API_TOKEN`, `ACME_EMAIL`

**Generate htpasswd:**

```bash
htpasswd -c ~/.htpasswd admin
```

**Steps:**

1. Validates all parameters
2. Creates `traefik-network` Docker network if it doesn't exist
3. Creates persistent volumes for TLS certs and access logs
4. Generates `.env` with Cloudflare credentials
5. Deploys Traefik via Docker Compose

---

## `github-runner.sh`

Deploys self-hosted GitHub Actions runners. Runners auto-register to the repository on container startup.

```bash
./github-runner.sh \
  --path ~/deployment \
  --repo https://github.com/owner/repo \
  --token ghp_xxx \
  --replicas 3
```

**Required flags:**

| Flag      | Description                               |
|-----------|-------------------------------------------|
| `--path`  | Path to the deployment directory          |
| `--repo`  | Full GitHub repository URL                |
| `--token` | GitHub personal access token (repo scope) |

**Optional flags:**

| Flag              | Default              | Purpose                              |
|-------------------|----------------------|--------------------------------------|
| `--replicas <n>`  | `1`                  | Number of runner containers to start |
| `--labels <list>` | `docker,self-hosted` | Comma-separated runner labels        |

**Env var equivalents:** `DEPLOYMENT_PATH`, `GITHUB_REPO_URL`, `GITHUB_ACCESS_TOKEN`, `PROJECT`, `RUNNER_REPLICAS`,
`RUNNER_LABELS`

Runners share the Docker socket — required for container image builds in CI workflows.
