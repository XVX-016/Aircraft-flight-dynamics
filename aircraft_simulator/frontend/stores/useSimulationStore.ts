import { create } from 'zustand';

interface SimulationState {
    // Flight Dynamics State
    position: [number, number, number]; // [x, y, z] in NED frame
    orientation: [number, number, number]; // [phi, theta, psi] Euler angles
    velocity: number; // True airspeed
    altitude: number;

    // Control Inputs
    controls: {
        throttle: number; // 0-1
        elevator: number; // -1 to 1
        aileron: number; // -1 to 1
        rudder: number; // -1 to 1
    };

    // Actions
    updateState: (newState: Partial<SimulationState>) => void;
    setControl: (control: keyof SimulationState['controls'], value: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
    position: [0, 0, -1000], // Start at 1000ft
    orientation: [0, 0, 0],
    velocity: 150, // Knots
    altitude: 1000,

    controls: {
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0,
    },

    updateState: (newState) => set((state) => ({ ...state, ...newState })),
    setControl: (control, value) =>
        set((state) => ({
            controls: { ...state.controls, [control]: value }
        })),
}));
