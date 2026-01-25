from __future__ import annotations

import csv
import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, Optional


@dataclass(frozen=True)
class LogSchema:
    """
    Central place to define canonical column groups.
    We still allow arbitrary extra fields, but these help standardize plots/tests.
    """

    # Truth signals (minimum set)
    truth_fields: tuple[str, ...] = (
        "t",
        "truth_altitude_m",
        "truth_phi_rad",
        "truth_theta_rad",
        "truth_psi_rad",
        "truth_u_mps",
        "truth_v_mps",
        "truth_w_mps",
    )

    # Measured signals (minimum set)
    meas_fields: tuple[str, ...] = (
        "meas_altitude_m",
        "meas_airspeed_mps",
        "meas_heading_rad",
    )

    # Controls (minimum set)
    control_fields: tuple[str, ...] = (
        "u_cmd_throttle",
        "u_cmd_elevator",
        "u_cmd_aileron",
        "u_cmd_rudder",
        "u_throttle",
        "u_elevator",
        "u_aileron",
        "u_rudder",
    )


class CsvLogger:
    def __init__(self, path: str, *, mkdir: bool = True):
        self.path = path
        if mkdir:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        self._f = open(self.path, "w", newline="", encoding="utf8")
        self._writer: Optional[csv.DictWriter] = None
        self._fieldnames: list[str] = []

    def close(self) -> None:
        if self._f:
            self._f.close()

    def log(self, row: Dict[str, Any]) -> None:
        if self._writer is None:
            self._fieldnames = list(row.keys())
            self._writer = csv.DictWriter(self._f, fieldnames=self._fieldnames)
            self._writer.writeheader()
        else:
            # allow schema growth (append new columns at end)
            new_keys = [k for k in row.keys() if k not in self._fieldnames]
            if new_keys:
                # rewrite header isn't trivial; instead, enforce stable schema in callers.
                raise ValueError(f"CSV schema changed. New keys: {new_keys}")
        self._writer.writerow(row)


class JsonlLogger:
    def __init__(self, path: str, *, mkdir: bool = True):
        self.path = path
        if mkdir:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        self._f = open(self.path, "w", encoding="utf8")

    def close(self) -> None:
        if self._f:
            self._f.close()

    def log(self, row: Dict[str, Any]) -> None:
        self._f.write(json.dumps(row) + "\n")


def default_log_path(prefix: str, ext: str = "csv", directory: str = "logs") -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(directory, f"{prefix}_{ts}.{ext}")



