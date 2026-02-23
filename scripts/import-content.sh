#!/bin/bash
#
# import-content.sh
#
# Parses Treehouse content library files and imports them into Convex.
#
# Usage:
#   ./scripts/import-content.sh
#
# Requirements:
#   - Node.js with tsx available (npx tsx)
#   - Convex CLI configured (npx convex)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_FILE="/tmp/treehouse-data.json"

echo "==> Parsing Treehouse content from markdown files..."
npx tsx "$SCRIPT_DIR/parse-treehouse-content.ts" > "$TMP_FILE"

echo ""
echo "==> Parsed data written to $TMP_FILE"
echo "    File size: $(wc -c < "$TMP_FILE" | tr -d ' ') bytes"
echo ""

echo "==> Importing data into Convex..."
npx convex run --no-push importTreehouse:importTreehouseData --arg-file "$TMP_FILE"

echo ""
echo "==> Import complete!"
