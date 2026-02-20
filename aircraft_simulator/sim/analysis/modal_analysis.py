from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np


@dataclass(frozen=True)
class ModeSummary:
    type: str
    family: str
    eigenvalue_real: float
    eigenvalue_imag: float
    wn: float | None
    zeta: float | None
    stable: bool


@dataclass(frozen=True)
class ModalAnalysisResult:
    eigenvalues: list[dict[str, float]]
    modes: list[ModeSummary]
    spectral_margin: float
    min_damping_ratio: float | None
    unstable_modes: int
    neutral_modes: int

    def as_dict(self) -> dict:
        return {
            "eigenvalues": self.eigenvalues,
            "modes": [asdict(m) for m in self.modes],
            "spectral_margin": self.spectral_margin,
            "min_damping_ratio": self.min_damping_ratio,
            "unstable_modes": self.unstable_modes,
            "neutral_modes": self.neutral_modes,
        }


def _dynamic_submatrix(A: np.ndarray) -> np.ndarray:
    A = np.asarray(A, dtype=float)
    if A.shape == (12, 12):
        return A[3:12, 3:12]
    if A.shape == (9, 9):
        return A
    raise ValueError(f"Expected A shape (12,12) or (9,9), got {A.shape}")


def _classify_mode(
    eig: complex,
    vec: np.ndarray,
    *,
    imag_tol: float,
) -> tuple[str, str, float | None, float | None]:
    # Dynamic-state ordering in A_d is [u, v, w, phi, theta, psi, p, q, r].
    long_idx = np.array([0, 2, 4, 7], dtype=int)   # u, w, theta, q
    lat_idx = np.array([1, 3, 5, 6, 8], dtype=int) # v, phi, psi, p, r

    mag2 = np.abs(vec) ** 2
    long_energy = float(np.sum(mag2[long_idx]))
    lat_energy = float(np.sum(mag2[lat_idx]))
    family = "longitudinal" if long_energy >= lat_energy else "lateral"

    sigma = float(np.real(eig))
    omega = float(np.imag(eig))
    if abs(omega) > imag_tol:
        wn = float(np.hypot(sigma, omega))
        zeta = float(-sigma / max(1e-12, wn))
        if family == "longitudinal":
            mode_type = "phugoid" if wn < 1.0 else "short_period"
        else:
            mode_type = "dutch_roll"
        return mode_type, family, wn, zeta

    wn = None
    zeta = None
    if family == "lateral":
        if abs(sigma) < 0.05:
            mode_type = "spiral"
        elif sigma < -0.5:
            mode_type = "roll"
        else:
            mode_type = "lateral_aperiodic"
    else:
        mode_type = "longitudinal_aperiodic"
    return mode_type, family, wn, zeta


def analyze_modal_structure(
    A: np.ndarray,
    *,
    unstable_tol: float = 1e-8,
    neutral_tol: float = 1e-8,
    imag_tol: float = 1e-8,
) -> ModalAnalysisResult:
    A_d = _dynamic_submatrix(A)
    eigvals, eigvecs = np.linalg.eig(A_d)

    eig_serialized = [{"real": float(ev.real), "imag": float(ev.imag)} for ev in eigvals]
    real_parts = np.real(eigvals)
    spectral_margin = float(-np.max(real_parts))
    unstable_modes = int(np.sum(real_parts > unstable_tol))
    neutral_modes = int(np.sum(np.abs(real_parts) <= neutral_tol))

    modes: list[ModeSummary] = []
    used = np.zeros(eigvals.size, dtype=bool)
    for i, eig in enumerate(eigvals):
        if used[i]:
            continue
        vec = eigvecs[:, i]
        if abs(float(np.imag(eig))) > imag_tol:
            # Process each conjugate pair once (positive-imag representative).
            if float(np.imag(eig)) < 0.0:
                used[i] = True
                continue
            conj_idx = None
            target = np.conjugate(eig)
            for j in range(eigvals.size):
                if i == j or used[j]:
                    continue
                if abs(eigvals[j] - target) < 1e-6:
                    conj_idx = j
                    break
            used[i] = True
            if conj_idx is not None:
                used[conj_idx] = True
            mode_type, family, wn, zeta = _classify_mode(eig, vec, imag_tol=imag_tol)
            modes.append(
                ModeSummary(
                    type=mode_type,
                    family=family,
                    eigenvalue_real=float(np.real(eig)),
                    eigenvalue_imag=float(np.imag(eig)),
                    wn=wn,
                    zeta=zeta,
                    stable=float(np.real(eig)) < 0.0,
                )
            )
        else:
            used[i] = True
            mode_type, family, wn, zeta = _classify_mode(eig, vec, imag_tol=imag_tol)
            modes.append(
                ModeSummary(
                    type=mode_type,
                    family=family,
                    eigenvalue_real=float(np.real(eig)),
                    eigenvalue_imag=0.0,
                    wn=wn,
                    zeta=zeta,
                    stable=float(np.real(eig)) < 0.0,
                )
            )

    modes.sort(key=lambda m: (m.family, m.type, m.eigenvalue_real, m.eigenvalue_imag))
    zetas = [m.zeta for m in modes if m.zeta is not None]
    min_damping_ratio = float(min(zetas)) if zetas else None

    return ModalAnalysisResult(
        eigenvalues=eig_serialized,
        modes=modes,
        spectral_margin=spectral_margin,
        min_damping_ratio=min_damping_ratio,
        unstable_modes=unstable_modes,
        neutral_modes=neutral_modes,
    )
