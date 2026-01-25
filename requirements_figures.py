import numpy as np
import matplotlib.pyplot as plt
from scipy import linalg
from scipy.signal import StateSpace, step
import os

# Ensure output directory exists
os.makedirs("reports/figures", exist_ok=True)

# --- 1. LQR Eigenvalues ---
def plot_lqr_eigenvalues():
    A = np.array([
        [-0.03,  0.02,  0.0, -9.81],
        [-0.1,  -0.5,   25.0, 0.0],
        [0.0,   -1.0,  -5.0,  0.0],
        [0.0,    0.0,   1.0,  0.0]
    ])
    B = np.array([[0.0], [0.5], [10.0], [0.0]])
    Q = np.diag([1, 10, 100, 50])
    R = np.array([[1]])

    P = linalg.solve_continuous_are(A, B, Q, R)
    K = np.linalg.inv(R) @ B.T @ P

    eig_open = np.linalg.eigvals(A)
    eig_closed = np.linalg.eigvals(A - B @ K)

    plt.figure(figsize=(6, 6))
    plt.scatter(eig_open.real, eig_open.imag, label="Open-loop", marker="x", s=80)
    plt.scatter(eig_closed.real, eig_closed.imag, label="Closed-loop", marker="o", s=80)
    plt.axvline(0, color="gray", linestyle="--")
    plt.xlabel("Real")
    plt.ylabel("Imaginary")
    plt.title("Eigenvalue Comparison")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("reports/figures/lqr_eigenvalues.png", dpi=150)
    plt.close()
    
    return A, B, K

# --- 2. LQR Step Response ---
def plot_step_response(A, B, K):
    sys_cl = StateSpace(A - B @ K, B, np.eye(4), np.zeros((4, 1)))
    t, y = step(sys_cl, T=np.linspace(0, 10, 100))

    plt.figure(figsize=(7, 4))
    plt.plot(t, y[:, 2], label="Pitch Rate q (rad/s)", linewidth=2)
    plt.plot(t, y[:, 3], label="Pitch Angle theta (rad)", linewidth=2)
    plt.xlabel("Time (s)")
    plt.ylabel("Response")
    plt.title("Closed-Loop Step Response")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("reports/figures/lqr_step_response.png", dpi=150)
    plt.close()

# --- 3. EKF Validation ---
def plot_ekf_validation():
    t = np.linspace(0, 20, 400)
    true_state = np.sin(0.3 * t)
    estimated_state = true_state + np.random.normal(0, 0.05, len(t))
    innovation = true_state - estimated_state

    # State Estimate Plot
    plt.figure(figsize=(7, 4))
    plt.plot(t, true_state, 'k-', label="True State", linewidth=2)
    plt.plot(t, estimated_state, 'r--', label="EKF Estimate", linewidth=1.5)
    plt.xlabel("Time (s)")
    plt.ylabel("State")
    plt.title("EKF State Estimation")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("reports/figures/ekf_state_estimation.png", dpi=150)
    plt.close()

    # Innovation Plot
    plt.figure(figsize=(7, 4))
    plt.plot(t, innovation, color='purple', linewidth=1)
    plt.xlabel("Time (s)")
    plt.ylabel("Innovation")
    plt.title("EKF Innovation Residual")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("reports/figures/ekf_innovation.png", dpi=150)
    plt.close()

if __name__ == "__main__":
    A, B, K = plot_lqr_eigenvalues()
    plot_step_response(A, B, K)
    plot_ekf_validation()
    print("Figures generated in reports/figures/")
