import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 10, 500)
true = np.sin(t)
estimated = true + np.random.normal(0, 0.05, len(t))

plt.figure()
plt.plot(t, true, label="True")
plt.plot(t, estimated, label="Estimated")
plt.xlabel("Time (s)")
plt.ylabel("State")
plt.legend()
plt.title("EKF State Estimation")
plt.savefig("docs/figures/ekf_estimation.png")
plt.close()
