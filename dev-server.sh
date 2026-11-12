#!/usr/bin/env bash
# Serves the site/ directory at http://localhost:8000 (or the port given as the first argument).
# A local server is needed, because the Google Sheet does not allow requests from file:// pages.
set -euo pipefail
cd "$(dirname "$0")/site"
port="${1:-8000}"
echo "Serving at http://localhost:$port/"
exec python3 -m http.server "$port" --bind 127.0.0.1
