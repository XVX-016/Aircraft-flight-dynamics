import { Sidebar } from "@/components/simulator/Sidebar";
import { Dashboard } from "@/components/simulator/Dashboard";

export default function SimulatorPage() {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <Dashboard />
        </div>
    );
}
