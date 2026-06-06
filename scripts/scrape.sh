#!/usr/bin/env bash
# Manually trigger an InSIS scrape job.
#
# Usage:
#   ./scripts/scrape.sh <API_URL> <JOB> <TOKEN>
#
# Arguments:
#   API_URL  Base URL of the API  (e.g. http://localhost:40080 or https://api.kreditozrouti.cz)
#   JOB      Which scraper to run:   catalog | studyplans | academic-schedules
#   TOKEN    Command token (Authorization: Bearer)
#
# Examples:
#   ./scripts/scrape.sh http://localhost:40080 catalog mysecrettoken
#   ./scripts/scrape.sh http://localhost:40080 academic-schedules mysecrettoken

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Args
# ------------------------------------------------------------------------------

API_URL="${1:-}"
JOB="${2:-}"
TOKEN="${3:-}"

usage() {
    echo "Usage: $0 <API_URL> JOB> <TOKEN>"
    echo ""
    echo "  API_URL   e.g. http://localhost:40080"
    echo "  JOB       catalog | studyplans | academic-schedules"
    echo "  TOKEN     command bearer token"
    echo ""
    echo "Examples:"
    echo "  $0 http://localhost:40080 catalog mytoken"
    echo "  $0 https://api.kreditozrouti.cz studyplans mytoken"
    echo "  $0 http://localhost:40080 academic-schedules mytoken"
    exit 1
}

# ------------------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------------------

[[ -z "$API_URL" || -z "$JOB" || -z "$TOKEN" ]] && usage

case "$JOB" in
    catalog)            ENDPOINT="/commands/insis/catalog" ;;
    studyplans)         ENDPOINT="/commands/insis/studyplans" ;;
    academic-schedules) ENDPOINT="/commands/insis/academic-schedules" ;;
    *) log_error "Invalid JOB '$JOB'. Must be: catalog | studyplans | academic-schedules"; usage ;;
esac

# ------------------------------------------------------------------------------
# Fire
# ------------------------------------------------------------------------------

URL="${API_URL}${ENDPOINT}"

log "Triggering ${JOB} scrape"
log "  URL:  ${URL}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}")

if [[ "$HTTP_CODE" == "202" ]]; then
    log_success "Accepted (202) — job enqueued."
else
    log_error "Unexpected response: HTTP ${HTTP_CODE}"
    exit 1
fi
