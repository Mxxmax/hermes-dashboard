#!/usr/bin/env bash
#
# Hermes Dashboard — One-click setup
# Installs dependencies, patches Hermes Agent backend, builds frontend.
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   Hermes Dashboard — Setup          ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check/Install hermes-agent ──────────────────────────
echo -e "${YELLOW}[1/4]${NC} Checking Hermes Agent installation..."

if python3 -c "import hermes_cli" 2>/dev/null; then
    HERMES_DIR=$(python3 -c "import hermes_cli; from pathlib import Path; print(str(Path(hermes_cli.__file__).parent.parent))")
    echo "  ✓ Hermes Agent found at: $HERMES_DIR"
else
    echo "  Installing hermes-agent..."
    pip3 install hermes-agent
    HERMES_DIR=$(python3 -c "import hermes_cli; from pathlib import Path; print(str(Path(hermes_cli.__file__).parent.parent))")
    echo "  ✓ Installed at: $HERMES_DIR"
fi

# ── Step 2: Patch backend ───────────────────────────────────────
echo -e "${YELLOW}[2/4]${NC} Patching dashboard API endpoints..."

cp "$SCRIPT_DIR/backend/hermes_cli/web_server.py" "$HERMES_DIR/hermes_cli/web_server.py"
echo "  ✓ hermes_cli/web_server.py"

TUI_DIR="$HERMES_DIR/tui_gateway"
if [ -d "$TUI_DIR" ]; then
    cp "$SCRIPT_DIR/backend/tui_gateway/server.py" "$TUI_DIR/server.py"
    echo "  ✓ tui_gateway/server.py"
else
    echo "  - tui_gateway/ not found (skipped)"
fi

CLI_FILE="$HERMES_DIR/cli.py"
if [ -f "$CLI_FILE" ]; then
    cp "$SCRIPT_DIR/backend/cli.py" "$CLI_FILE"
    echo "  ✓ cli.py"
else
    echo "  - cli.py not found at expected path (skipped)"
fi

# ── Step 3: Install frontend deps ──────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Installing frontend dependencies..."

if command -v npm &>/dev/null; then
    cd "$SCRIPT_DIR"
    npm install --silent 2>&1 | tail -1
    echo "  ✓ npm install complete"
else
    echo -e "  ${YELLOW}⚠ npm not found. Install Node.js and run 'npm install' manually.${NC}"
fi

# ── Step 4: Build frontend ──────────────────────────────────────
echo -e "${YELLOW}[4/4]${NC} Building frontend..."

if command -v npm &>/dev/null; then
    cd "$SCRIPT_DIR"
    npm run build 2>&1 | tail -3
    echo "  ✓ Frontend built"
    # Copy built files to backend web_dist
    mkdir -p "$SCRIPT_DIR/hermes_cli"
    cp -r dist "$SCRIPT_DIR/hermes_cli/web_dist" 2>/dev/null || true
    echo "  ✓ Assets copied to backend"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup complete!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "  Start the dashboard:"
echo ""
echo "    ./start.sh"
echo ""
echo "  Or manually:"
echo "    python3 -m backend.run"
echo ""
echo "  Then open: http://localhost:9119"
echo ""
