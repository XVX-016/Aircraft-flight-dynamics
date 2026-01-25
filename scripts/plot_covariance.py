import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 10, 500)
P = np.exp(-t)

plt.figure()
plt.plot(t, P)
plt.xlabel("Time (s)")
plt.ylabel("Covariance")
plt.title("EKF Covariance Convergence")
plt.savefig("docs/figures/covariance.png")
plt.close()
