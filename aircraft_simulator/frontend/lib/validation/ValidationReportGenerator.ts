
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ValidationSnapshot } from "../simulation/ValidationSystem";

export class ValidationReportGenerator {

    public static generateReport(snapshot: ValidationSnapshot) {
        const doc = new jsPDF();

        // --- Header ---
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Estimator Validation Metrics", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Trim Condition: ${snapshot.trimId}`, 14, 33);

        const verdict = snapshot.consistency.nees < snapshot.consistency.bounds.nees95 ? "PASS" : "FAIL";
        const verdictColor = verdict === "PASS" ? [0, 150, 0] : [200, 0, 0];
        doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
        doc.setFontSize(14);
        doc.text(`OVERALL VERDICT: ${verdict}`, 150, 20);

        // --- Executive Summary ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("1. Executive Summary", 14, 45);

        doc.setFontSize(10);
        const summary = [
            `Evaluated estimator consistency (${snapshot.trimId}) under Monte-Carlo simulation.`,
            `Consistency Analysis:`,
            `- NEES: ${snapshot.consistency.nees.toFixed(2)} (Limit: ${snapshot.consistency.bounds.nees95}) -> ${verdict}`,
            `- NIS: ${snapshot.consistency.nis.toFixed(2)} (Limit: ${snapshot.consistency.bounds.nis95})`,
            `Observability:`,
            `- Weakest Mode: σ = ${snapshot.observability.singularValues[snapshot.observability.singularValues.length - 1].toExponential(2)}`
        ];
        doc.text(summary, 14, 55);

        // --- 2. Linearization Snapshot ---
        doc.setFontSize(14);
        doc.text("2. Linearization (Jacobian Structure)", 14, 85);

        // Assuming we want to visualize F matrix sparsity or just stats
        // Let's print stats of F
        const fFlat = snapshot.F.flat();
        const nonZeros = fFlat.filter(v => Math.abs(v) > 1e-6).length;
        const sparsity = (1 - nonZeros / fFlat.length) * 100;

        doc.setFontSize(10);
        doc.text(`Dynamics Jacobian F (19x19):`, 14, 95);
        doc.text(`- Non-Zero Elements: ${nonZeros}`, 20, 102);
        doc.text(`- Sparsity: ${sparsity.toFixed(1)}%`, 20, 108);

        // --- 3. Observability Spectrum ---
        doc.setFontSize(14);
        doc.text("3. Observability Analysis", 14, 125);

        const spectrumData = snapshot.observability.singularValues.map((s, i) => [
            (i + 1).toString(),
            s.toExponential(4),
            s > 1e-5 ? "Observable" : "Weak/Unobservable"
        ]);

        autoTable(doc, {
            startY: 135,
            head: [['Mode', 'Singular Value (σ)', 'Interpretation']],
            body: spectrumData,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] }
        });

        // --- 4. Consistency ---
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text("4. Consistency & Failure Analysis", 14, finalY);

        const consistencyData = [
            ['Metric', 'Measured', 'Bound (95%)', 'Status'],
            ['NEES (State)', snapshot.consistency.nees.toFixed(3), snapshot.consistency.bounds.nees95.toFixed(3), snapshot.consistency.nees < snapshot.consistency.bounds.nees95 ? 'PASS' : 'FAIL'],
            ['NIS (Meas)', snapshot.consistency.nis.toFixed(3), snapshot.consistency.bounds.nis95.toFixed(3), snapshot.consistency.nis < snapshot.consistency.bounds.nis95 ? 'PASS' : 'FAIL']
        ];

        autoTable(doc, {
            startY: finalY + 10,
            head: [['Metric', 'Value', 'Bound', 'Status']],
            body: consistencyData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] }
        });

        // Save
        doc.save(`validation_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}
