import numpy as np
import matplotlib.pyplot as plt

eig_open = np.array([-0.5+0.3j, -0.5-0.3j, 0.2])
eig_closed = np.array([-1.2+0.5j, -1.2-0.5j, -0.8])

plt.figure()
plt.scatter(eig_open.real, eig_open.imag, label="Open-loop", marker="x")
plt.scatter(eig_closed.real, eig_closed.imag, label="Closed-loop", marker="o")
plt.axvline(0, linestyle="--")
plt.xlabel("Real")
plt.ylabel("Imaginary")
plt.legend()
plt.title("Eigenvalue Comparison")
plt.savefig("docs/figures/eigenvalues.png")
plt.close()
