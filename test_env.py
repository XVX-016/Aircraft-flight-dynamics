import numpy as np
import scipy
import control
import matplotlib.pyplot as plt

print("NumPy:", np.__version__)
print("SciPy:", scipy.__version__)
print("Control:", control.__version__)

A = np.array([[0,1],[-2,-3]])
B = np.array([[0],[1]])
Q = np.eye(2)
R = np.array([[1]])

K, S, E = control.lqr(A, B, Q, R)
print("LQR Gain:", K)
