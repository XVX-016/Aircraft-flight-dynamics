import { create } from 'zustand';
import { simulationEngine } from '@/lib/simulation/simulation-engine';

export interface SimulationState {
    // UI/Scene State
    sceneState: 'takeoff' | 'hangar' | 'specs';
    qualityTier: 'low' | 'mid' | 'high';
    isPaused: boolean;

    // Control Inputs (Synced with Engine)
    controls: {
        throttle: number; // 0-1
        elevator: number; // -1 to 1
        aileron: number; // -1 to 1
        rudder: number; // -1 to 1
    };

    // Telemetry
    position: [number, number, number];
    velocity: number;
    altitude: number;
    orientation: [number, number, number]; // [phi, theta, psi]

    // Actions
    updateTelemetry: (data: { position: [number, number, number], velocity: number, altitude: number, orientation: [number, number, number] }) => void;
    setControl: (axis: 'throttle' | 'elevator' | 'aileron' | 'rudder', value: number) => void;
    setScene: (scene: SimulationState['sceneState']) => void;
    setQuality: (tier: SimulationState['qualityTier']) => void;
    setPaused: (paused: boolean) => void;
    resetSimulation: () => void;
    updateState: (updates: Partial<SimulationState>) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
    sceneState: 'takeoff',
    qualityTier: 'high',
    isPaused: false,

    // Telemetry Init
    position: [0, 0, -1000],
    velocity: 150,
    altitude: 1000,
    orientation: [0, 0, 0],

    controls: {
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0,
    },

    updateTelemetry: (data) => set(() => ({
        position: data.position,
        velocity: data.velocity,
        altitude: data.altitude,
        orientation: data.orientation
    })),

    updateState: (updates) => set((state) => ({ ...state, ...updates })),

    setControl: (control, value) => {
        // Update Store
        set((state) => ({
            controls: { ...state.controls, [control]: value }
        }));
        // Update Engine Directly
        simulationEngine.setControls({ [control]: value });
    },

    setScene: (scene) => set({ sceneState: scene }),
    setQuality: (tier) => set({ qualityTier: tier }),
    setPaused: (paused) => set({ isPaused: paused }),

    resetSimulation: () => {
        // TODO: Implement engine reset
        set({
            controls: { throttle: 0, elevator: 0, aileron: 0, rudder: 0 },
            isPaused: false
        });
    }
}));
