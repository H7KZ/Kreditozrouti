# Deployment entry points

This repository owns the [application deploy script](../../deployment/deploy.sh), [monitoring stack](../../deployment/monitoring/), and [GitHub runner stack](../../deployment/github-runner/). The separate Infrastructure repository owns host setup and the shared Traefik proxy.

Use the [deployment guide](../deployment/README.md) for the current workflow, required configuration, and operations. Use [DNS setup](../setup/DNS.md) for records this app needs.

| Entry point | Role |
| --- | --- |
| `deployment/deploy.sh` | Start the selected application services from a version directory |
| `deployment/monitoring/deploy.sh` | Start Prometheus, Grafana, Loki, and Alloy |
| `deployment/github-runner/deploy.sh` | Register self-hosted GitHub Actions runners |

The workflows in [`.github/workflows`](../../.github/workflows/) invoke these scripts. Follow their required environment variables rather than copying old VPS bootstrap commands.
