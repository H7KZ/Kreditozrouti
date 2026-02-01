#!/bin/sh
set -e

# ==============================================================================
# Script: docker-entrypoint.sh
# Description: Injects runtime environment variables into built Vue.js assets.
#
# This script runs before nginx starts and replaces placeholder values
# in the built JavaScript files with actual environment variable values.
#
# Supported Variables:
#   - VITE_API_URL: Backend API URL
#   - VITE_SENTRY_DSN: GlitchTip/Sentry DSN
#   - VITE_SENTRY_RELEASE: Release version tag
# ==============================================================================

DIST_DIR="/usr/share/nginx/html"

echo "Injecting runtime environment variables..."

# Function to escape special characters for sed
escape_sed() {
    echo "$1" | sed -e 's/[\/&]/\\&/g'
}

# Replace placeholders in all JS files
# Using find to handle cases where there might be multiple JS files
find "$DIST_DIR" -type f -name "*.js" | while read -r file; do
    # Only process if file contains our placeholders
    if grep -q "__VITE_.*_PLACEHOLDER__" "$file" 2>/dev/null; then
        echo "Processing: $file"

        # Replace VITE_API_URL
        if [ -n "$VITE_API_URL" ]; then
            sed -i "s|__VITE_API_URL_PLACEHOLDER__|$(escape_sed "$VITE_API_URL")|g" "$file"
        fi

        # Replace VITE_SENTRY_DSN
        if [ -n "$VITE_SENTRY_DSN" ]; then
            sed -i "s|__VITE_SENTRY_DSN_PLACEHOLDER__|$(escape_sed "$VITE_SENTRY_DSN")|g" "$file"
        else
            # If not set, replace with empty string
            sed -i "s|__VITE_SENTRY_DSN_PLACEHOLDER__||g" "$file"
        fi

        # Replace VITE_SENTRY_RELEASE
        if [ -n "$VITE_SENTRY_RELEASE" ]; then
            sed -i "s|__VITE_SENTRY_RELEASE_PLACEHOLDER__|$(escape_sed "$VITE_SENTRY_RELEASE")|g" "$file"
        else
            sed -i "s|__VITE_SENTRY_RELEASE_PLACEHOLDER__|latest|g" "$file"
        fi
    fi
done

echo "Environment injection complete."
echo "  VITE_API_URL: ${VITE_API_URL:-<not set>}"
echo "  VITE_SENTRY_DSN: ${VITE_SENTRY_DSN:-<not set>}"
echo "  VITE_SENTRY_RELEASE: ${VITE_SENTRY_RELEASE:-latest}"
