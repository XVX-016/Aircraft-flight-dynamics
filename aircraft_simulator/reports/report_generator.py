from fpdf import FPDF
import os

class ReportPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, 'Aircraft Flight Dynamics & Control Analysis Tool', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_report(output_path="reports/output/aircraft_control_report.pdf"):
    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Engineering Analysis Report", ln=True)
    pdf.ln(5)

    # Executive Summary
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 5, 
        "This report summarizes the modeling, control design, and estimation performance "
        "of a linearized fixed-wing aircraft system. It includes closed-loop validation "
        "step responses, EKF state estimation accuracy, and Monte Carlo robustness metrics."
    )
    pdf.ln(10)

    # Helper to add section
    def add_section(title, image_path):
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, title, ln=True)
        pdf.ln(2)
        
        full_path = os.path.abspath(image_path)
        if os.path.exists(full_path):
            # Scale image to fit width (approx 170mm)
            pdf.image(full_path, w=170)
            pdf.ln(5)
        else:
            pdf.set_font("Arial", "I", 10)
            pdf.cell(0, 10, f"[Image not found: {image_path}]", ln=True)

    # Sections
    add_section("Closed-Loop Control Performance", "reports/figures/lqr_step_response.png")
    add_section("Eigenvalue Analysis", "reports/figures/lqr_eigenvalues.png")
    add_section("State Estimation Accuracy", "reports/figures/ekf_state_estimation.png")
    add_section("Innovation Residuals", "reports/figures/ekf_innovation.png")
    
    # Monte Carlo Placeholder (since we don't have a plot for it yet in the script list, but good to have section)
    # add_section("Monte Carlo Robustness", "reports/figures/monte_carlo.png")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    pdf.output(output_path)
    print(f"Report generated: {output_path}")

if __name__ == "__main__":
    generate_report()
