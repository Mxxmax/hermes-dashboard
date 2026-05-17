# Hermes Dashboard

Browser-based dashboard for managing Hermes Agent — providers, models, sessions, cron jobs, skills, config, and more.

**One command to set up, one command to run.**

## Quick Start

```bash
# Clone
git clone https://github.com/Mxxmax/hermes-dashboard.git
cd hermes-dashboard

# One-command setup (installs Python deps, patches backend, builds frontend)
./setup.sh

# Start
./start.sh
```

Open http://localhost:9119 in your browser.

> **Prerequisites:** Python 3.10+, Node.js 18+, npm

## What's Included

This repo contains both the **frontend** and **backend** code:

| Layer | Directory | Description |
|-------|-----------|-------------|
| Frontend | `src/` | React 19 + Vite 7 + TypeScript SPA |
| Backend patches | `backend/hermes_cli/` | Modified `web_server.py` with new API endpoints |
| Backend patches | `backend/tui_gateway/` | Modified `server.py` with improved provider listing |
| Setup script | `setup.sh` | Auto-installs everything |

### Enhanced Features

- **Inline Add API Key** — Configure providers directly from the Model Picker dialog
- **Auto-fetch Models** — Enter a base URL and fetch available models automatically
- **Custom Providers** — Add any OpenAI-compatible endpoint
- **Only Configured Providers** — Unconfigured providers are hidden (no clutter)

## Manual Setup

If you prefer to do things manually:

```bash
# 1. Install Python dependencies
pip install hermes-agent uvicorn

# 2. Apply backend patches
cp backend/hermes_cli/web_server.py $(python3 -c "import hermes_cli; from pathlib import Path; print(Path(hermes_cli.__file__).parent.parent)")/hermes_cli/web_server.py

# 3. Install and build frontend
npm install
npm run build

# 4. Start the server
python3 -m backend.run
```

## Development

```bash
# Start the backend
python3 -m backend.run

# In another terminal, start Vite dev server (with HMR)
npm run dev
```

The Vite dev server proxies `/api` requests to `http://127.0.0.1:9119`.

## Project Structure

```
hermes-dashboard/
├── setup.sh                # One-click setup (recommended)
├── start.sh                # One-click start
├── backend/
│   ├── hermes_cli/         # Patched web_server.py with new API endpoints
│   ├── tui_gateway/        # Patched server.py with improved provider listing
│   ├── requirements.txt    # Python dependencies
│   └── run.py              # Server entry point
├── src/                    # React 19 + TypeScript frontend
├── package.json
├── vite.config.ts
└── README.md
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_HOST` | `127.0.0.1` | Server bind address |
| `HERMES_PORT` | `9119` | Server port |
| `HERMES_LOG_LEVEL` | `info` | Logging level |

## License

MIT
