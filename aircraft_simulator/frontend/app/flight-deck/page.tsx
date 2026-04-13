"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { FlightSimProvider, useFlightSimContext } from "@/context/FlightSimContext";
import { useAircraftContext } from "@/context/AircraftContext";
import FlightAircraftMesh from "@/components/3d/flight/FlightAircraftMesh";
import FlightTrail from "@/components/3d/flight/FlightTrail";
import GroundGrid from "@/components/3d/flight/GroundGrid";
import ChaseCamera from "@/components/3d/flight/ChaseCamera";
import TopCamera from "@/components/3d/flight/TopCamera";
import SideCamera from "@/components/3d/flight/SideCamera";
import WindArrow from "@/components/3d/flight/WindArrow";
import InstrumentPanel from "@/components/flight-deck/InstrumentPanel";
import "./flight-deck.css";

// ── Page wrapper — mounts the FlightSimProvider scoped to this route ─────────

export default function FlightDeckPage() {
    return (
        <FlightSimProvider>
            <FlightDeckInner />
        </FlightSimProvider>
    );
}

// ── Inner component — consumes the flight sim context ────────────────────────

function FlightDeckInner() {
    const { state, history, sendCommand, status, connected } = useFlightSimContext();
    const { selectedAircraftId } = useAircraftContext();

    // View tracking refs
    const chaseRef = useRef<HTMLDivElement>(null!);
    const topRef = useRef<HTMLDivElement>(null!);
    const sideRef = useRef<HTMLDivElement>(null!);

    const statusLabel =
        status === "connected"
            ? "LIVE"
            : status === "connecting"
                ? "CONNECTING"
                : status === "reconnecting"
                    ? "RECONNECTING"
                    : "OFFLINE";

    const dotClass =
        status === "connected"
            ? "connection-dot--connected"
            : status === "connecting" || status === "reconnecting"
                ? "connection-dot--connecting"
                : "connection-dot--disconnected";

    return (
        <div style={{ position: "relative" }}>
            {/* ── 2x2 panel grid ──────────────────────────────────────── */}
            <div className="flight-deck">
                {/* Panel 1: Chase cam */}
                <div ref={chaseRef} className="flight-deck-panel flight-deck-panel-3d">
                    <span className="flight-deck-panel-label">Chase</span>
                    <div className="connection-indicator">
                        <span className={`connection-dot ${dotClass}`} />
                        <span>{statusLabel}</span>
                    </div>
                </div>

                {/* Panel 2: Top-down map */}
                <div ref={topRef} className="flight-deck-panel flight-deck-panel-3d">
                    <span className="flight-deck-panel-label">Map</span>
                </div>

                {/* Panel 3: Side profile */}
                <div ref={sideRef} className="flight-deck-panel flight-deck-panel-3d">
                    <span className="flight-deck-panel-label">Profile</span>
                </div>

                {/* Panel 4: Instruments (pure HTML/SVG) */}
                <div className="flight-deck-panel" style={{ zIndex: 10 }}>
                    <span className="flight-deck-panel-label">Instruments</span>
                    <InstrumentPanel
                        state={state}
                        history={history}
                        sendCommand={sendCommand}
                        connected={connected}
                    />
                </div>
            </div>

            {/* ── Single global Canvas renders all three 3D views ──── */}
            <div className="flight-deck-canvas">
                <Canvas
                    style={{ width: "100%", height: "100%" }}
                    dpr={[1, 1.5]}
                    gl={{
                        antialias: false,
                        alpha: false,
                        powerPreference: "high-performance",
                    }}
                    eventSource={undefined}
                >
                    <Suspense fallback={null}>
                        {/* ── Chase view ────────────────────────────── */}
                        <View track={chaseRef}>
                            <ambientLight intensity={0.3} />
                            <directionalLight position={[5, 10, 5]} intensity={0.8} />
                            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
                            <ChaseCamera state={state} />
                            <FlightAircraftMesh
                                state={state}
                                aircraftId={selectedAircraftId}
                            />
                            <FlightTrail history={history} />
                            <GroundGrid />
                        </View>

                        {/* ── Top-down view ─────────────────────────── */}
                        <View track={topRef}>
                            <ambientLight intensity={0.4} />
                            <directionalLight position={[0, 100, 0]} intensity={0.5} />
                            <TopCamera state={state} />
                            <FlightAircraftMesh
                                state={state}
                                aircraftId={selectedAircraftId}
                            />
                            <FlightTrail history={history} />
                            <WindArrow />
                            <GroundGrid />
                        </View>

                        {/* ── Side profile view ─────────────────────── */}
                        <View track={sideRef}>
                            <ambientLight intensity={0.4} />
                            <directionalLight position={[5, 5, -10]} intensity={0.6} />
                            <SideCamera state={state} />
                            <FlightAircraftMesh
                                state={state}
                                aircraftId={selectedAircraftId}
                            />
                            <FlightTrail history={history} />
                            <GroundGrid />
                        </View>
                    </Suspense>
                </Canvas>
            </div>
        </div>
    );
}
