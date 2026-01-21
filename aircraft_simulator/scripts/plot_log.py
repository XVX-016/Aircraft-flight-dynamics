from __future__ import annotations

import argparse
import os

import matplotlib.pyplot as plt
import pandas as pd

from sim.analysis.metrics import step_response_metrics


def main() -> None:
    p = argparse.ArgumentParser(description="Plot standard figures from a simulator CSV log.")
    p.add_argument("log_csv", help="path to CSV log (from sim/simulator.py)")
    p.add_argument("--outdir", default="plots", help="output directory for PNGs")
    p.add_argument("--target_alt", type=float, default=None, help="optional altitude target for step metrics")
    args = p.parse_args()

    df = pd.read_csv(args.log_csv)
    os.makedirs(args.outdir, exist_ok=True)

    # Altitude
    plt.figure(figsize=(9, 4))
    plt.plot(df["t"], df["truth_altitude_m"], label="truth altitude")
    if "meas_altitude_m" in df.columns:
        plt.plot(df["t"], df["meas_altitude_m"], label="meas altitude", alpha=0.6)
    plt.xlabel("t [s]")
    plt.ylabel("Altitude [m]")
    plt.grid(True, alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "altitude.png"), dpi=150)

    # Airspeed
    if "meas_airspeed_mps" in df.columns:
        plt.figure(figsize=(9, 4))
        plt.plot(df["t"], df["meas_airspeed_mps"], label="meas airspeed")
        plt.xlabel("t [s]")
        plt.ylabel("Airspeed [m/s]")
        plt.grid(True, alpha=0.25)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(args.outdir, "airspeed.png"), dpi=150)

    # Heading
    if "meas_heading_rad" in df.columns:
        plt.figure(figsize=(9, 4))
        plt.plot(df["t"], df["meas_heading_rad"] * 180.0 / 3.141592653589793, label="meas heading")
        plt.xlabel("t [s]")
        plt.ylabel("Heading [deg]")
        plt.grid(True, alpha=0.25)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(args.outdir, "heading.png"), dpi=150)

    if args.target_alt is not None:
        m = step_response_metrics(df["t"], df["truth_altitude_m"], y_target=float(args.target_alt))
        print("Altitude step metrics:")
        print(f"  overshoot: {100*m.overshoot_frac:.1f}%")
        print(f"  rise time (10-90%): {m.rise_time_s}")
        print(f"  settling time (2%): {m.settling_time_s}")

    print(f"Wrote plots to {args.outdir}")


if __name__ == "__main__":
    main()



