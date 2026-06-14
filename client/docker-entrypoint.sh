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
#   - VITE_API_COMMAND_TOKEN: Bearer token for manual scrape trigger
#   - VITE_FARO_COLLECTOR_URL: Grafana Faro collector endpoint
#   - VITE_APP_VERSION: App version tag sent to Faro
#   - VITE_UMAMI_WEBSITE_ID: Umami Analytics website ID (leave empty to disable)
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

        # Replace VITE_API_COMMAND_TOKEN
        if [ -n "$VITE_API_COMMAND_TOKEN" ]; then
            sed -i "s|__VITE_API_COMMAND_TOKEN_PLACEHOLDER__|$(escape_sed "$VITE_API_COMMAND_TOKEN")|g" "$file"
        else
            sed -i "s|__VITE_API_COMMAND_TOKEN_PLACEHOLDER__||g" "$file"
        fi

        # Replace VITE_FARO_COLLECTOR_URL
        if [ -n "$VITE_FARO_COLLECTOR_URL" ]; then
            sed -i "s|__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__|$(escape_sed "$VITE_FARO_COLLECTOR_URL")|g" "$file"
        else
            sed -i "s|__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__||g" "$file"
        fi

        # Replace VITE_APP_VERSION
        if [ -n "$VITE_APP_VERSION" ]; then
            sed -i "s|__VITE_APP_VERSION_PLACEHOLDER__|$(escape_sed "$VITE_APP_VERSION")|g" "$file"
        else
            sed -i "s|__VITE_APP_VERSION_PLACEHOLDER__|latest|g" "$file"
        fi

        # Replace VITE_UMAMI_WEBSITE_ID
        if [ -n "$VITE_UMAMI_WEBSITE_ID" ]; then
            sed -i "s|__VITE_UMAMI_WEBSITE_ID_PLACEHOLDER__|$(escape_sed "$VITE_UMAMI_WEBSITE_ID")|g" "$file"
        else
            sed -i "s|__VITE_UMAMI_WEBSITE_ID_PLACEHOLDER__||g" "$file"
        fi
    fi
done

echo "Environment injection complete."
echo "  VITE_API_URL: ${VITE_API_URL:-<not set>}"
echo "  VITE_API_COMMAND_TOKEN: ${VITE_API_COMMAND_TOKEN:-<not set>}"
echo "  VITE_FARO_COLLECTOR_URL: ${VITE_FARO_COLLECTOR_URL:-<not set>}"
echo "  VITE_APP_VERSION: ${VITE_APP_VERSION:-latest}"
echo "  VITE_UMAMI_WEBSITE_ID: ${VITE_UMAMI_WEBSITE_ID:-<not set>}"
