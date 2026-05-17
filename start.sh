#!/usr/bin/env bash
#
# Hermes Dashboard — Start the backend server
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check that patches are applied
if ! python3 -c "import hermes_cli.web_server; print('✓ Hermes Agent loaded')" 2>/dev/null; then
    echo "Error: Hermes Agent not installed. Run ./setup.sh first."
    exit 1
fi

echo "Starting Hermes Dashboard on http://localhost:9119 ..."
cd "$SCRIPT_DIR"
python3 -m backend.run
