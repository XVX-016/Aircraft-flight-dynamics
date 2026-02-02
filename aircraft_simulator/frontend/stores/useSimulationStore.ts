import { create } from 'zustand';

/**
 * UI-Only Store
 * 
 * This store holds UI state that does NOT belong in SimCore:
 * - Scene selection (which 3D scene to show)
 * - Quality tier (visual settings)
 * - Pause state
 * 
 * TELEMETRY IS NO LONGER HERE.
 * Use `useSim()` hook from SimProvider for truth state.
 */
export interface SimulationState {
    // UI/Scene State
    sceneState: 'takeoff' | 'hangar' | 'specs' | 'estimation' | 'void';
    qualityTier: 'low' | 'mid' | 'high';
    isPaused: boolean;

    // Validation Telemetry (Bridged from Validation Lab)
    estimatedState?: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number; w: number };
    };
    covariance?: number[][]; // 3x3 Position Covariance

    // Actions
    setScene: (scene: SimulationState['sceneState']) => void;
    setQuality: (tier: SimulationState['qualityTier']) => void;
    setPaused: (paused: boolean) => void;
    updateState: (updates: Partial<SimulationState>) => void;
    setEstimationData: (
        data: {
            estimatedState: SimulationState['estimatedState'],
            covariance: SimulationState['covariance']
        }
    ) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
    sceneState: 'takeoff',
    qualityTier: 'high',
    isPaused: false,

    setScene: (scene) => set({ sceneState: scene }),
    setQuality: (tier) => set({ qualityTier: tier }),
    setPaused: (paused) => set({ isPaused: paused }),
    updateState: (updates) => set((state) => ({ ...state, ...updates })),
    setEstimationData: (data) => set(data),
}));

