import { TruthState } from "./types/state";
import { DerivedPhysics } from "./derived-physics";

export interface Snapshot {
    timestamp: string;
    truth: TruthState;
    derived: DerivedPhysics;
    validation: any;
}

/**
 * FORMAL DATA EXPORTER
 * Captures simulation data for external analysis and reporting.
 */
export const ReportExporter = {
    captureSnapshot: (truth: TruthState, derived: DerivedPhysics, validation: any): Snapshot => {
        return {
            timestamp: new Date().toISOString(),
            truth,
            derived,
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

