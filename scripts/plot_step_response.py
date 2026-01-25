import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 10, 500)
theta = 0.1 * (1 - np.exp(-0.8 * t))

plt.figure()
plt.plot(t, theta)
plt.xlabel("Time (s)")
plt.ylabel("Pitch Angle (rad)")
plt.title("Pitch Step Response")
plt.savefig("docs/figures/pitch_step.png")
plt.close()
