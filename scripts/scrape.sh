#!/usr/bin/env bash
# Manually trigger an InSIS scrape job.
#
# Usage:
#   ./scripts/scrape.sh <API_URL> <MODE> <JOB> <TOKEN>
#
# Arguments:
#   API_URL  Base URL of the API  (e.g. http://localhost:40080 or https://api.kreditozrouti.cz)
#   MODE     Scraping aggressiveness: turbo | normal | polite
#   JOB      Which scraper to run:   catalog | studyplans
#   TOKEN    Command token (Authorization: Bearer)
#
# Examples:
#   ./scripts/scrape.sh http://localhost:40080 polite catalog mysecrettoken
#   ./scripts/scrape.sh https://api.kreditozrouti.cz turbo studyplans mysecrettoken
#
# Modes:
#   turbo   — No delays, max concurrency. For scheduled night runs only.
#   normal  — Moderate pacing (1s between leaf jobs, reduced concurrency).
#   polite  — Slow, human-like pacing (3s between leaf jobs, min concurrency). Default for daytime.

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Args
# ------------------------------------------------------------------------------

API_URL="${1:-}"
MODE="${2:-}"
JOB="${3:-}"
TOKEN="${4:-}"

usage() {
    echo "Usage: $0 <API_URL> <MODE> <JOB> <TOKEN>"
    echo ""
    echo "  API_URL   e.g. http://localhost:40080"
    echo "  MODE      turbo | normal | polite"
    echo "  JOB       catalog | studyplans"
    echo "  TOKEN     command bearer token"
    echo ""
    echo "Examples:"
    echo "  $0 http://localhost:40080 polite catalog mytoken"
    echo "  $0 https://api.kreditozrouti.cz turbo studyplans mytoken"
    exit 1
}

# ------------------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------------------

[[ -z "$API_URL" || -z "$MODE" || -z "$JOB" || -z "$TOKEN" ]] && usage

case "$MODE" in
    turbo|normal|polite) ;;
    *) log_error "Invalid MODE '$MODE'. Must be: turbo | normal | polite"; usage ;;
esac

case "$JOB" in
    catalog)    ENDPOINT="/commands/insis/catalog" ;;
    studyplans) ENDPOINT="/commands/insis/studyplans" ;;
    *) log_error "Invalid JOB '$JOB'. Must be: catalog | studyplans"; usage ;;
esac

# ------------------------------------------------------------------------------
# Fire
# ------------------------------------------------------------------------------

URL="${API_URL}${ENDPOINT}"
BODY="{\"mode\":\"${MODE}\"}"

log "Triggering ${JOB} scrape"
log "  URL:  ${URL}"
log "  Mode: ${MODE}"
log "  Body: ${BODY}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "$BODY")

if [[ "$HTTP_CODE" == "202" ]]; then
    log_success "Accepted (202) — job enqueued."
else
    log_error "Unexpected response: HTTP ${HTTP_CODE}"
    exit 1
fi
