#!/usr/bin/env python3
"""
Generate AntiTrader School skybox via Blockade Labs API (same stack as worldgen-oasis-demo).
Requires: pip install requests. API key: export BLOCKADE_LABS_API_KEY, or rely on
worldgen-oasis-demo/.env (loaded automatically).

Writes default-skybox.json beside student-dashboard.html (for optional fetch) and prints file_url.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Repo root: .../OASIS_CLEAN
_HERE = Path(__file__).resolve()
REPO_ROOT = _HERE.parents[3]
WORLDGEN = REPO_ROOT / "worldgen-oasis-demo"


def _load_worldgen_dotenv() -> None:
    """Load BLOCKADE_LABS_API_KEY from worldgen-oasis-demo/.env if not already set (same as demo_blockade_skybox_only.py)."""
    if os.environ.get("BLOCKADE_LABS_API_KEY"):
        return
    env_file = WORLDGEN / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_worldgen_dotenv()

if str(WORLDGEN) not in sys.path:
    sys.path.insert(0, str(WORLDGEN))

from blockade_client import generate_skybox_sync  # noqa: E402

PROMPT = (
    "Serene tropical beach at golden hour sunset, equirectangular 360 degree panorama, "
    "warm orange pink and violet sky with soft scattered clouds, sun low on the horizon "
    "casting long reflections on calm shallow water and wet sand, "
    "gentle waves lapping the shore, distant mountain range silhouetted along the horizon, "
    "layers of atmospheric haze in the valleys, "
    "empty beach no people no buildings, natural photorealistic, peaceful cinematic mood, "
    "ultra wide angle landscape, high detail sand texture and water sparkle."
)


def main() -> int:
    out_dir = _HERE.parent.parent
    print("=== AntiTrader School — Blockade skybox ===\n", flush=True)
    print("Calling Blockade Labs API (may take 1–3 minutes)…\n", flush=True)
    payload = generate_skybox_sync(PROMPT)
    file_url = (payload.get("file_url") or "").strip()
    thumb_url = (payload.get("thumb_url") or "").strip()
    if not file_url:
        print("Error: response had no file_url", file=sys.stderr)
        return 1

    data = {
        "prompt": PROMPT,
        "file_url": file_url,
        "thumb_url": thumb_url,
        "source": "blockade_labs",
    }
    json_path = out_dir / "default-skybox.json"
    json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"file_url:\n  {file_url}\n", flush=True)
    print(f"Wrote {json_path.relative_to(REPO_ROOT)}", flush=True)
    print(
        "\nOpen the dashboard with a local server (not file://):\n"
        f"  cd {out_dir}\n"
        "  python3 -m http.server 8765\n"
        "  → http://localhost:8765/student-dashboard.html\n",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as e:
        if "API key" in str(e):
            print(
                "Set BLOCKADE_LABS_API_KEY (see worldgen-oasis-demo/BLOCKADE_API_KEY_USAGE.md).",
                file=sys.stderr,
            )
        print(str(e), file=sys.stderr)
        raise SystemExit(1)
