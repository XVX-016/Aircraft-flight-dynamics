import numpy as np


def run_monte_carlo(sim_fn, runs=20, seed: int | None = None):
    """
    Runs Monte Carlo simulations with stochastic wind gusts.

    Args:
        sim_fn: Function that takes (wind_speed) and returns (t, states).
                states expected to be [N, state_dim], where col 3 is theta.
        runs: Number of iterations.
        seed: Optional deterministic seed for reproducible batches.

    Returns:
        List of result dictionaries.
    """
    results = []
    rng = np.random.default_rng(seed)

    for i in range(runs):
        wind = float(rng.normal(0.0, 1.5))  # m/s gust (sigma = 1.5)
        t, states = sim_fn(wind)

        # Assuming theta is index 3 (standard longitudinal state: u, w, q, theta)
        theta = states[:, 3]
        rmse = np.sqrt(np.mean(theta**2))

        results.append({
            "run": i,
            "wind_gust_mps": wind,
            "rmse_theta_rad": rmse,
            "max_theta_rad": np.max(np.abs(theta))
        })

    return results


if __name__ == "__main__":
    import pandas as pd

    def demo_sim(w):
        t = np.linspace(0, 10, 100)
        # Damped pitch response under constant wind-gust bias.
        theta = 0.1 * np.exp(-0.5*t) * np.sin(2*t) + 0.01 * w
        states = np.zeros((100, 4))
        states[:, 3] = theta
        return t, states

    res = run_monte_carlo(demo_sim, seed=7)
    df = pd.DataFrame(res)
    print(df.describe())
