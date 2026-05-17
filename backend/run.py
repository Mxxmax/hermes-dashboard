#!/usr/bin/env python3
"""
Hermes Dashboard — Backend server entry point.

Starts the FastAPI server with the extended dashboard API.
The modified web_server files must already be installed
(run ./setup.sh to patch them automatically).
"""
import sys
import os

# Ensure we can find the patched hermes_cli
# (The files are copied to site-packages by setup.sh)

from hermes_cli.web_server import app

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HERMES_HOST", "127.0.0.1")
    port = int(os.environ.get("HERMES_PORT", "9119"))

    print(f"  → Dashboard: http://{host}:{port}")
    print(f"  → Stop with: Ctrl+C")
    print()

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level=os.environ.get("HERMES_LOG_LEVEL", "info"),
    )
