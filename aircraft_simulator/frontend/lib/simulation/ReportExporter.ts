import { SimulationState } from "@/stores/useSimulationStore";

export interface Snapshot {
    timestamp: string;
    state: Partial<SimulationState>;
    validation: any;
}

/**
 * FORMAL DATA EXPORTER
 * Captures simulation data for external analysis and reporting.
 */
export const ReportExporter = {
    captureSnapshot: (state: SimulationState, validation: any): Snapshot => {
        return {
            timestamp: new Date().toISOString(),
            state: {
                position: state.position,
                orientation: state.orientation,
                velocity: state.velocity,
                altitude: state.altitude,
                controls: state.controls
            },
            validation
        };
    },

    exportAsJSON: (snapshot: Snapshot) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `ADCS_SIM_Report_${snapshot.timestamp}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
};
