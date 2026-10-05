#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: validate.sh
# Description: Validates the monitoring config with the same images the stack runs:
#              promtool (config, rules, rule unit tests), amtool, loki -verify-config,
#              alloy validate. Files are copied into throwaway containers with
#              `docker cp`, not bind-mounted, so it behaves the same on a laptop and on
#              the self-hosted runner (whose bind paths would resolve on the host).
#
# Usage:       bash deployment/monitoring/validate.sh
#              (Git Bash on Windows: MSYS_NO_PATHCONV=1 bash deployment/monitoring/validate.sh)
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/../lib.sh"

image_of() {
    grep -Eo "image: *$1:[^ ]+" "$SCRIPT_DIR/docker-compose.monitoring.yml" | head -1 | sed -E 's/image: *//'
}

readonly PROMETHEUS_IMAGE="$(image_of prom/prometheus)"
readonly ALERTMANAGER_IMAGE="$(image_of prom/alertmanager)"
readonly LOKI_IMAGE="$(image_of grafana/loki)"
readonly ALLOY_IMAGE="$(image_of grafana/alloy)"

FAILED=()

# run <name> <image> <entrypoint> <source dir> <target dir> [args...]
run() {
    local name="$1" image="$2" entrypoint="$3" source="$4" target="$5"
    shift 5
    local id output status=0
    id="$(docker create --entrypoint "$entrypoint" "$image" "$@")"
    # Git Bash on Windows: hand docker a native path (run with MSYS_NO_PATHCONV=1 there).
    command -v cygpath >/dev/null && source="$(cygpath -m "$source")"
    docker cp "$source/." "$id:$target" >/dev/null
    output="$(docker start --attach "$id" 2>&1)" || status=$?
    docker rm --force "$id" >/dev/null
    if [[ $status -eq 0 ]]; then
        log_success "$name"
    else
        log_error "$name"
        echo "$output"
        FAILED+=("$name")
    fi
}

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

main() {
    local work="$WORK_DIR"

    # Alertmanager checks that the url files it references exist.
    cp -r "$SCRIPT_DIR/alertmanager" "$work/alertmanager"
    mkdir -p "$work/alertmanager/secrets"
    printf '%s' 'https://discord.com/api/webhooks/0/check' > "$work/alertmanager/secrets/discord_webhook_url"
    printf '%s' 'https://hc-ping.com/check' > "$work/alertmanager/secrets/healthchecks_ping_url"

    run 'promtool check config' "$PROMETHEUS_IMAGE" promtool "$SCRIPT_DIR/prometheus" /etc/prometheus check config --syntax-only /etc/prometheus/prometheus.yml
    run 'promtool check rules' "$PROMETHEUS_IMAGE" sh "$SCRIPT_DIR/prometheus" /etc/prometheus -c 'promtool check rules /etc/prometheus/rules/*.yml'
    run 'promtool test rules' "$PROMETHEUS_IMAGE" promtool "$SCRIPT_DIR/prometheus" /etc/prometheus test rules /etc/prometheus/tests/alerts.test.yml
    run 'amtool check-config' "$ALERTMANAGER_IMAGE" amtool "$work/alertmanager" /etc/alertmanager check-config /etc/alertmanager/alertmanager.yml
    run 'loki -verify-config' "$LOKI_IMAGE" /usr/bin/loki "$SCRIPT_DIR/loki" /etc/loki -config.file=/etc/loki/loki.yml -verify-config
    run 'alloy validate' "$ALLOY_IMAGE" /bin/alloy "$SCRIPT_DIR/alloy" /etc/alloy validate /etc/alloy/config.alloy

    if [[ ${#FAILED[@]} -gt 0 ]]; then
        log_error "Failed: ${FAILED[*]}"
        exit 1
    fi
    log_success "Monitoring config is valid"
}

main
