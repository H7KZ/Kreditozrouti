#!/usr/bin/env bash
# Manually trigger an InSIS scrape job.
#
# Usage:
#   ./scripts/scrape.sh <API_URL> <JOB> <TOKEN>
#
# Arguments:
#   API_URL  Base URL of the API  (e.g. http://localhost:40080 or https://api.kreditozrouti.cz)
#   JOB      Which scraper to run:   catalog | studyplans | academic-schedules | retry-failed
#   TOKEN    Command token (Authorization: Bearer)
#
# Examples:
#   ./scripts/scrape.sh http://localhost:40080 catalog mysecrettoken
#   ./scripts/scrape.sh http://localhost:40080 academic-schedules mysecrettoken
#   ./scripts/scrape.sh http://localhost:40080 retry-failed mysecrettoken

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Args
# ------------------------------------------------------------------------------

API_URL="${1:-}"
JOB="${2:-}"
TOKEN="${3:-}"

usage() {
    echo "Usage: $0 <API_URL> <JOB> <TOKEN>"
    echo ""
    echo "  API_URL   e.g. http://localhost:40080"
    echo "  JOB       catalog | studyplans | academic-schedules | retry-failed"
    echo "  TOKEN     command bearer token"
    echo ""
    echo "Examples:"
    echo "  $0 http://localhost:40080 catalog mytoken"
    echo "  $0 https://api.kreditozrouti.cz studyplans mytoken"
    echo "  $0 http://localhost:40080 academic-schedules mytoken"
    echo "  $0 http://localhost:40080 retry-failed mytoken"
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
    retry-failed)       ENDPOINT="/commands/insis/retry-failed" ;;
    *) log_error "Invalid JOB '$JOB'. Must be: catalog | studyplans | academic-schedules | retry-failed"; usage ;;
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

EXPECTED_CODE="202"
[[ "$JOB" == "retry-failed" ]] && EXPECTED_CODE="200"

if [[ "$HTTP_CODE" == "$EXPECTED_CODE" ]]; then
    log_success "Success (${HTTP_CODE})."
else
    log_error "Unexpected response: HTTP ${HTTP_CODE}"
    exit 1
fi
