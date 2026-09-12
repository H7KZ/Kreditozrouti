#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: sync-grafana-alerts.sh
# Description: Deletes Grafana alert rules that are no longer present in the
#              committed deployment/monitoring/grafana/provisioning/alerting/rules.yml,
#              then triggers a provisioning reload for alerting and dashboards.
#
#              Grafana's file-based provisioner only adds/updates rules found in
#              the YAML on disk - it never deletes a rule that was removed from
#              the file. Redeploying monitoring after a rules.yml change (or a
#              dashboards.json change) therefore leaves orphaned, stale rules
#              armed in Grafana, which is what caused the false/stale Discord
#              alert storm this script exists to prevent. Run it after every
#              monitoring redeploy - it is idempotent and safe to run when
#              nothing has changed.
#
# Usage:       GRAFANA_URL=https://grafana.example.com \
#              GRAFANA_ADMIN_USER=admin \
#              GRAFANA_ADMIN_PASSWORD=... \
#              ./sync-grafana-alerts.sh [path/to/rules.yml]
#
#              rules.yml path defaults to
#              deployment/monitoring/grafana/provisioning/alerting/rules.yml
#              relative to the repo root.
#
# Environment variables:
#   GRAFANA_URL              Base URL of the Grafana instance (required), e.g.
#                             https://grafana.kreditozrouti.cz
#   GRAFANA_ADMIN_USER        Basic auth username (required unless GRAFANA_API_TOKEN is set)
#   GRAFANA_ADMIN_PASSWORD    Basic auth password (required unless GRAFANA_API_TOKEN is set)
#   GRAFANA_API_TOKEN         Service account token - takes precedence over user/password
#   DRY_RUN                   Set to "true" to only print what would be deleted (default: false)
#
# Requirements:
#   - curl, python3 with PyYAML (for parsing rules.yml UIDs and the provisioning
#     API response) - PyYAML is required, the stdlib json module is not enough
#     to read rules.yml
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly RULES_FILE="${1:-$REPO_ROOT/deployment/monitoring/grafana/provisioning/alerting/rules.yml}"
readonly DRY_RUN="${DRY_RUN:-false}"

source "$SCRIPT_DIR/lib.sh"

if [[ -z "${GRAFANA_URL:-}" ]]; then
    log_error "GRAFANA_URL is required, e.g. GRAFANA_URL=https://grafana.example.com $0"
    exit 1
fi

if [[ ! -f "$RULES_FILE" ]]; then
    log_error "Rules file not found: $RULES_FILE"
    exit 1
fi

# Auth header: prefer a service account token, fall back to basic auth.
AUTH_ARGS=()
if [[ -n "${GRAFANA_API_TOKEN:-}" ]]; then
    AUTH_ARGS=(-H "Authorization: Bearer $GRAFANA_API_TOKEN")
elif [[ -n "${GRAFANA_ADMIN_USER:-}" && -n "${GRAFANA_ADMIN_PASSWORD:-}" ]]; then
    AUTH_ARGS=(-u "$GRAFANA_ADMIN_USER:$GRAFANA_ADMIN_PASSWORD")
else
    log_error "Set GRAFANA_API_TOKEN, or both GRAFANA_ADMIN_USER and GRAFANA_ADMIN_PASSWORD."
    exit 1
fi

curl_json() {
    curl -sS -H "Accept: application/json" "${AUTH_ARGS[@]}" "$@"
}

# ------------------------------------------------------------------------------
# Step 1: uids committed in rules.yml
# ------------------------------------------------------------------------------
log "Reading committed alert rule UIDs from $RULES_FILE ..."
mapfile -t COMMITTED_UIDS < <(python3 - "$RULES_FILE" <<'PYEOF'
import sys
import yaml

with open(sys.argv[1], encoding="utf-8") as f:
    doc = yaml.safe_load(f)

uids = []
for group in doc.get("groups", []):
    for rule in group.get("rules", []):
        uid = rule.get("uid")
        if uid:
            uids.append(uid)

for uid in uids:
    print(uid)
PYEOF
)

if [[ ${#COMMITTED_UIDS[@]} -eq 0 ]]; then
    log_error "Parsed zero UIDs out of $RULES_FILE - refusing to continue (would delete everything in Grafana)."
    exit 1
fi

log "Found ${#COMMITTED_UIDS[@]} committed rule UID(s)."

# ------------------------------------------------------------------------------
# Step 2: uids currently provisioned in Grafana
# ------------------------------------------------------------------------------
log "Fetching currently provisioned alert rules from $GRAFANA_URL ..."
GRAFANA_RULES_JSON="$(curl_json "$GRAFANA_URL/api/v1/provisioning/alert-rules")"

mapfile -t GRAFANA_UIDS < <(printf '%s' "$GRAFANA_RULES_JSON" | python3 - <<'PYEOF'
import json
import sys

data = json.load(sys.stdin)
for rule in data:
    uid = rule.get("uid")
    if uid:
        print(uid)
PYEOF
)

log "Grafana currently has ${#GRAFANA_UIDS[@]} provisioned rule(s)."

# ------------------------------------------------------------------------------
# Step 3: compute orphans (in Grafana, not in rules.yml) and delete them
# ------------------------------------------------------------------------------
ORPHANED_UIDS=()
for uid in "${GRAFANA_UIDS[@]}"; do
    found=false
    for committed in "${COMMITTED_UIDS[@]}"; do
        if [[ "$uid" == "$committed" ]]; then
            found=true
            break
        fi
    done
    if [[ "$found" == false ]]; then
        ORPHANED_UIDS+=("$uid")
    fi
done

if [[ ${#ORPHANED_UIDS[@]} -eq 0 ]]; then
    log_success "No orphaned alert rules - Grafana already matches rules.yml."
else
    log "Found ${#ORPHANED_UIDS[@]} orphaned rule(s) to delete: ${ORPHANED_UIDS[*]}"

    for uid in "${ORPHANED_UIDS[@]}"; do
        if [[ "$DRY_RUN" == "true" ]]; then
            log "[dry-run] would DELETE /api/v1/provisioning/alert-rules/$uid"
            continue
        fi

        log "Deleting orphaned rule $uid ..."
        http_code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
            -H "X-Disable-Provenance: true" \
            "${AUTH_ARGS[@]}" \
            "$GRAFANA_URL/api/v1/provisioning/alert-rules/$uid")"

        if [[ "$http_code" == "204" || "$http_code" == "404" ]]; then
            log_success "Deleted $uid (HTTP $http_code)"
        else
            log_error "Failed to delete $uid (HTTP $http_code) - continuing with the rest."
        fi
    done
fi

# ------------------------------------------------------------------------------
# Step 4: trigger a provisioning reload so alerting + dashboards state is fresh
# ------------------------------------------------------------------------------
if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] would POST /api/admin/provisioning/alerting/reload"
    log "[dry-run] would POST /api/admin/provisioning/dashboards/reload"
else
    log "Reloading alerting provisioning ..."
    curl_json -X POST "$GRAFANA_URL/api/admin/provisioning/alerting/reload" >/dev/null
    log "Reloading dashboards provisioning ..."
    curl_json -X POST "$GRAFANA_URL/api/admin/provisioning/dashboards/reload" >/dev/null
    log_success "Provisioning reload triggered."
fi

log_success "Grafana alert rule sync complete."
