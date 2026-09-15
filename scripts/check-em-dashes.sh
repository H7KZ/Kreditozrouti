#!/usr/bin/env bash
# ==============================================================================
# Script: check-em-dashes.sh
# Description: Enforces the repo house rule (.claude/CLAUDE.md) that forbids em
#              dashes in shipped user-facing text. Fails if any em dash (U+2014)
#              is found in the priority paths.
# Usage: bash scripts/check-em-dashes.sh
# ==============================================================================

set -euo pipefail

# Priority user-facing text paths (see issue #174).
paths=(
	"web/src/locales/en.json"
	"web/src/locales/cs.json"
	"web/src/legal"
	"web/src/pages/docs"
	"web/src/pages/about"
)

# grep -r returns 1 when no match found; that is the success case here.
if matches=$(grep -rn $'—' "${paths[@]}" 2>/dev/null); then
	echo "Found em dashes in user-facing text - use a plain hyphen (-) instead:"
	echo "$matches"
	exit 1
fi

echo "No em dashes found in user-facing text."
