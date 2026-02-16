export type DerivativeFunction = (t: number, state: number[]) => number[];

export class Integrator {
    public static rk4(
        t: number,
        state: number[],
        dt: number,
        derivativeFn: DerivativeFunction
    ): number[] {
        const k1 = derivativeFn(t, state);

        const stateK2 = state.map((s, i) => s + k1[i] * dt / 2);
        const k2 = derivativeFn(t + dt / 2, stateK2);

        const stateK3 = state.map((s, i) => s + k2[i] * dt / 2);
        const k3 = derivativeFn(t + dt / 2, stateK3);

        const stateK4 = state.map((s, i) => s + k3[i] * dt);
        const k4 = derivativeFn(t + dt, stateK4);

        return state.map((s, i) =>
            s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
        );
    }
}
