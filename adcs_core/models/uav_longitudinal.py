import numpy as np

def uav_longitudinal_model(params):
    """
    Returns A, B matrices for a small fixed-wing UAV.
    State x = [u, w, q, theta] (4x1) + Thrust T (1x1) => Augmented 5x1
    Input u = [delta_e, T_cmd] (2x1)
    """
    # Base aerodynamics (4x4)
    A_aero = np.array([
        [-0.03,  0.05,  0.0,  -9.81],
        [-0.1,  -0.5,  25.0,   0.0],
        [ 0.0,  -2.0,  -3.0,   0.0],
        [ 0.0,   0.0,   1.0,   0.0]
    ])

    # Base control (4x1 for elevator)
    B_elev = np.array([
        [0.0],
        [-5.0],
        [-10.0],
        [0.0]
    ])

    # Thrust affects u-dot (forward accel)
    # T_dot = (1/tau)*(T_cmd - T)
    tau_T = 0.5  # Time constant
    
    # Augmented A (5x5)
    # [A_aero  B_T]
    # [0       -1/tau]
    
    # B_T: how T affects [u, w, q, theta]. Primarily u.
    # X_prop = T. u_dot approx X/m. Let's assume normalized or part of A.
    # The user prompt implies B_T is [1, 0, 0, 0]^T loosely.
    
    # Using user provided structure:
    # A = [[A_aero coeffs], [0... -1/tau]]
    
    # Reconstructing from prompt:
    # A = [ ...
    #      [ ..., -9.81], ... ]
    
    A = np.zeros((5, 5))
    A[0:4, 0:4] = A_aero
    # Coupling: Thrust affects u (row 0)
    A[0, 4] = 1.0  # approximate scaling
    
    A[4, 4] = -1.0 / tau_T

    B = np.zeros((5, 2))
    # Elevator column
    B[0:4, 0:1] = B_elev
    
    # T_cmd column (affects T_dot)
    B[4, 1] = 1.0 / tau_T

    return A, B
