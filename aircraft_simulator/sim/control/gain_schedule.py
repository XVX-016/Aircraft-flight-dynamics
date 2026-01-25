import numpy as np
from scipy import linalg

def lqr(A, B, Q, R):
    # Solve Continuous-time Algebraic Riccati Equation
    P = linalg.solve_continuous_are(A, B, Q, R)
    # Compute optimal feedback gain
    K = np.linalg.inv(R) @ B.T @ P
    return K

# Example trim speeds
trim_speeds = [40, 60, 80]  # m/s
K_table = {}

# Placeholder for linearize_aircraft function. 
# In a real implementation, this would call the actual linearization routine.
def linearize_aircraft(V):
    # Dummy placeholder matrices scaling with V
    A = np.array([
        [-0.03*V/50,  0.02,  0.0, -9.81],
        [-0.1,  -0.5*V/50,   25.0, 0.0],
        [0.0,   -1.0,  -5.0*V/50,  0.0],
        [0.0,    0.0,   1.0,  0.0]
    ])
    B = np.array([
        [0.0],
        [0.5*V/50],
        [10.0*V/50],
        [0.0]
    ])
    return A, B

# Precompute gains
for V in trim_speeds:
    A, B = linearize_aircraft(V)
    Q = np.diag([1, 10, 100, 50])
    R = np.array([[1]])
    K_table[V] = lqr(A, B, Q, R)

def interpolate_gain(V):
    speeds = np.array(list(K_table.keys()))
    # Stack gains for interpolation
    # Assuming K is flattened for interp, then reshaped, or iterating elements.
    # Simple 1D interp for demonstration (assuming scalar gain or doing element-wise)
    # Correct component-wise interpolation:
    
    # Get shape of K
    K_shape = K_table[speeds[0]].shape
    K_interp = np.zeros(K_shape)
    
    for i in range(K_shape[0]):
        for j in range(K_shape[1]):
            vals = np.array([K_table[s][i, j] for s in speeds])
            K_interp[i, j] = np.interp(V, speeds, vals)

    return K_interp
