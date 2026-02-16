from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PKG = ROOT / "aircraft_simulator"

for p in (str(ROOT), str(PKG)):
    if p not in sys.path:
        sys.path.insert(0, p)

