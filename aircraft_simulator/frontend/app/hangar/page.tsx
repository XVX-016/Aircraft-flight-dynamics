"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAircraftRequest, postJSON } from "@/lib/api";
import AircraftSpecs from "@/components/hangar/AircraftSpecs";
import HangarViewer from "@/components/hangar/HangarViewer";
import { HangarMetadata } from "@/components/hangar/HangarMetadata";
import { useAircraftContext } from "@/context/AircraftContext";
import {
    makeDefaultCustomAircraft,
    type CustomAircraftDefinition,
    validateCustomAircraft,
} from "@/lib/customAircraft";

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="hud-panel rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-1 text-[10px] uppercase text-white/40">{label}</div>
            <div className="text-sm font-mono text-white">{value}</div>
        </div>
    );
}

// ── NaN-safe field ─────────────────────────────────────────────────────────
// Problem with the previous version: comparing raw === external caused the
// field to snap back to the parent value while the user was still typing,
// making it impossible to edit the last digit.
//
// Fix: track whether the field is focused with a ref. While focused, always
// show the local raw string the user is typing. Only sync from the parent
// prop when the field is NOT focused (i.e. after blur or on initial render).
function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
}) {
    const toStr = (v: string | number) =>
        v === undefined || v === null || (typeof v === "number" && !Number.isFinite(v))
            ? ""
            : String(v);

    const [raw, setRaw] = useState<string>(toStr(value));
    const focused = useRef(false);

    // Only accept parent updates when the user is not actively editing
    const displayed = focused.current ? raw : toStr(value);

    return (
        <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-white/40">{label}</span>
            <input
                type="text"
                inputMode="decimal"
                value={displayed}
                onFocus={() => {
                    focused.current = true;
                    setRaw(toStr(value));
                }}
                onChange={(e) => {
                    setRaw(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={(e) => {
                    focused.current = false;
                    // Normalise numeric fields on blur so the parent always
                    // holds a clean float, not a partial string like "-0."
                    const trimmed = e.target.value.trim();
                    const parsed = Number.parseFloat(trimmed);
                    if (!Number.isNaN(parsed)) {
                        const normalised = String(parsed);
                        setRaw(normalised);
                        onChange(normalised);
                    }
                    // Text fields (Name, Notes, etc.) pass through unchanged
                }}
                className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono text-white focus:border-white/30 focus:outline-none"
            />
        </label>
    );
}

const fmt = (value: number | null | undefined, digits = 3) =>
    value === null || value === undefined || !Number.isFinite(value)
        ? "--"
        : value.toFixed(digits);

const BUILT_IN_OPTIONS = [
    { value: "cessna_172r",  label: "Cessna 172R — trainer — stable" },
    { value: "f16_research", label: "F-16 — research — relaxed" },
];

export default function HangarPage() {
    const {
        selectedAircraftId,
        selectedAircraftKind,
        metadata,
        aircraftData,
        loading,
        error,
        computed,
        customAircraftRegistry,
        saveCustomAircraft,
        deleteCustomAircraft,
        duplicateCustomAircraft,
        exportCustomAircraft,
        setAircraft,
        selectCustomAircraft,
        flightCondition,
    } = useAircraftContext();

    const router = useRouter();

    const [draft, setDraft]               = useState<CustomAircraftDefinition>(makeDefaultCustomAircraft());
    const [draftErrors, setDraftErrors]   = useState<string[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showEditor, setShowEditor]     = useState(false);

    const metrics = computed.metrics ?? {};

    // Safe numeric updater — keeps previous value while field is mid-edit
    const num = (v: string, fallback: number) => {
        const p = Number.parseFloat(v);
        return Number.isNaN(p) ? fallback : p;
    };

    const groupedFields = useMemo(
        () => [
            ["Wing area",   draft.geometry.wing_area,              (v: string) => setDraft((p) => ({ ...p, geometry: { ...p.geometry, wing_area:              num(v, p.geometry.wing_area) } }))],
            ["Wingspan",    draft.geometry.wingspan,               (v: string) => setDraft((p) => ({ ...p, geometry: { ...p.geometry, wingspan:               num(v, p.geometry.wingspan) } }))],
            ["Mean chord",  draft.geometry.mean_aerodynamic_chord, (v: string) => setDraft((p) => ({ ...p, geometry: { ...p.geometry, mean_aerodynamic_chord: num(v, p.geometry.mean_aerodynamic_chord) } }))],
            ["Tail arm",    draft.geometry.tail_arm,               (v: string) => setDraft((p) => ({ ...p, geometry: { ...p.geometry, tail_arm:               num(v, p.geometry.tail_arm) } }))],
            ["CG location", draft.geometry.cg_location,           (v: string) => setDraft((p) => ({ ...p, geometry: { ...p.geometry, cg_location:            num(v, p.geometry.cg_location) } }))],
            ["Mass",        draft.inertia.mass,                    (v: string) => setDraft((p) => ({ ...p, inertia: { ...p.inertia, mass: num(v, p.inertia.mass) } }))],
            ["Ixx",         draft.inertia.Ixx,                     (v: string) => setDraft((p) => ({ ...p, inertia: { ...p.inertia, Ixx:  num(v, p.inertia.Ixx) } }))],
            ["Iyy",         draft.inertia.Iyy,                     (v: string) => setDraft((p) => ({ ...p, inertia: { ...p.inertia, Iyy:  num(v, p.inertia.Iyy) } }))],
            ["Izz",         draft.inertia.Izz,                     (v: string) => setDraft((p) => ({ ...p, inertia: { ...p.inertia, Izz:  num(v, p.inertia.Izz) } }))],
            ["Ixz",         draft.inertia.Ixz,                     (v: string) => setDraft((p) => ({ ...p, inertia: { ...p.inertia, Ixz:  num(v, p.inertia.Ixz) } }))],
            ["Xu",          draft.aero.Xu,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Xu:  num(v, p.aero.Xu) } }))],
            ["Zw",          draft.aero.Zw,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Zw:  num(v, p.aero.Zw) } }))],
            ["Mw",          draft.aero.Mw,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Mw:  num(v, p.aero.Mw) } }))],
            ["Mq",          draft.aero.Mq,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Mq:  num(v, p.aero.Mq) } }))],
            ["Lp",          draft.aero.Lp,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Lp:  num(v, p.aero.Lp) } }))],
            ["Nr",          draft.aero.Nr,  (v: string) => setDraft((p) => ({ ...p, aero: { ...p.aero, Nr:  num(v, p.aero.Nr) } }))],
            ["Density",     draft.params.rho_kgm3,         (v: string) => setDraft((p) => ({ ...p, params: { ...p.params, rho_kgm3:         num(v, p.params.rho_kgm3) } }))],
            ["Max thrust",  draft.params.max_thrust_N,     (v: string) => setDraft((p) => ({ ...p, params: { ...p.params, max_thrust_N:     num(v, p.params.max_thrust_N) } }))],
            ["CL alpha",    draft.params.CL_alpha_per_rad, (v: string) => setDraft((p) => ({ ...p, params: { ...p.params, CL_alpha_per_rad: num(v, p.params.CL_alpha_per_rad) } }))],
            ["Cm alpha",    draft.params.Cm_alpha_per_rad, (v: string) => setDraft((p) => ({ ...p, params: { ...p.params, Cm_alpha_per_rad: num(v, p.params.Cm_alpha_per_rad) } }))],
        ],
        [draft]
    );

    const handleAnalyzeDraft = async () => {
        const nextErrors = validateCustomAircraft(draft);
        setDraftErrors(nextErrors);
        if (nextErrors.length > 0) return;
        saveCustomAircraft(draft);
        await selectCustomAircraft(draft.id);
    };

    const handleExport = (item: CustomAircraftDefinition) => {
        const json = exportCustomAircraft(item.id);
        if (!json) return;
        const blob   = new Blob([json], { type: "application/json" });
        const url    = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href     = url;
        anchor.download = `${item.name.replace(/\s+/g, "_")}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const openEditor = (item?: CustomAircraftDefinition) => {
        setDraft(item ?? makeDefaultCustomAircraft());
        setDraftErrors([]);
        setShowEditor(true);
        setTimeout(() => {
            document
                .getElementById("custom-editor")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    };

    const [confirmation, setConfirmation] = useState<any>(null);

    const handleFly = async () => {
        if (!selectedAircraftId) return;
        
        setLoading(true);
        try {
            // If custom, send the full draft. If preset, just send the ID.
            const payload = selectedAircraftKind === "custom" 
                ? { custom_aircraft: draft, ...flightCondition } 
                : { aircraft_id: selectedAircraftId, ...flightCondition };

            const response = await postJSON<any>("/api/v1/aircraft/select", payload);
            
            // Show confirmation with computed metrics from the backend
            setConfirmation(response);
            
            // Brief pause to let user see metrics, then fly
            setTimeout(() => {
                router.push("/flight-deck");
            }, 2500);
        } catch (err) {
            setConfirmation(null);
            setLoading(false);
            // Error handling already handled by postJSON? Unlikely to reach here if fetch fails.
        }
    };

    return (
        <div className="bg-neutral-950 text-white">
            <main className="mx-auto max-w-[1920px] space-y-8 px-8 pb-16 pt-24">

                {/* Header */}
                <header className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
                    <div>
                        <h1 className="mb-2 text-xs font-mono uppercase tracking-[0.4em] text-white/40">
                            Aircraft Hangar
                        </h1>
                        <h2 className="text-3xl font-bold tracking-tight text-white">
                            Configuration &amp; Analysis
                        </h2>
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                        {selectedAircraftId
                            ? `${selectedAircraftKind} : ${selectedAircraftId}`
                            : "No aircraft selected"}
                    </div>
                </header>

                {/* ── Two-column layout — items-stretch so both columns are equal height */}
                <div className="grid grid-cols-1 items-stretch gap-8 xl:grid-cols-12">

                    {/* LEFT — selector + specs + bottom-aligned dataset card */}
                    <div className="flex flex-col space-y-6 xl:col-span-5">

                        {/* Backend dataset label */}
                        <div className="hud-panel rounded-xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="mb-1 text-[10px] uppercase text-white/40">
                                Backend Dataset Loaded
                            </div>
                            <div className="text-xs font-mono text-white/70">
                                {metadata
                                    ? `${metadata.name} — ${metadata.classification} — ${metadata.stabilityMode}`
                                    : "—"}
                            </div>
                        </div>

                        {/* Dropdown model selector */}
                        <div className="hud-panel rounded-xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="mb-3 text-[10px] uppercase text-white/40">
                                Select Configuration
                            </div>
                            <select
                                defaultValue=""
                                onChange={(e) => {
                                    if (e.target.value) void setAircraft(e.target.value);
                                }}
                                className="w-full border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono uppercase tracking-widest text-white/80 focus:outline-none"
                            >
                                <option value="" disabled>— Choose model —</option>
                                {BUILT_IN_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fly Button — High visibility */}
                        <button
                            onClick={() => void handleFly()}
                            disabled={!selectedAircraftId || loading}
                            className={`hud-panel flex items-center justify-center gap-3 rounded-xl border p-6 transition-all ${
                                !selectedAircraftId || loading
                                    ? "border-white/5 bg-white/[0.01] text-white/20"
                                    : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500/60 hover:bg-cyan-500/20"
                            }`}
                        >
                            <span className="text-sm font-bold uppercase tracking-[0.2em]">Fly This Aircraft</span>
                            {loading ? (
                                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            )}
                        </button>

                        {/* Specs — grows to fill remaining column height */}
                        <div className="flex-1">
                            {error ? (
                                <div className="text-xs font-mono text-red-400">{error}</div>
                            ) : (
                                <AircraftSpecs aircraft={aircraftData} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT — viewer + My Aircraft + metrics + dataset detail */}
                    <div className="flex flex-col space-y-6 xl:col-span-7">

                        {/* 3D viewer — dominant */}
                        <div
                            className="overflow-hidden border border-white/10 bg-black"
                            style={{ minHeight: "520px" }}
                        >
                            <HangarViewer
                                aircraftId={selectedAircraftId}
                                name={metadata?.name ?? null}
                                wingspan={aircraftData?.geometry.wingspan ?? null}
                                classification={metadata?.classification ?? null}
                            />
                        </div>

                        {/* My Aircraft — below viewer */}
                        <div className="hud-panel rounded-xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="text-[10px] uppercase text-white/40">My Aircraft</div>
                                <button
                                    onClick={() => openEditor()}
                                    className="border border-white/20 px-2 py-1 text-[10px] font-mono uppercase text-white/70 hover:bg-white/5"
                                >
                                    + New
                                </button>
                            </div>
                            <div className="max-h-[260px] space-y-3 overflow-auto pr-1">
                                {customAircraftRegistry.length === 0 && (
                                    <div className="text-xs font-mono text-white/50">
                                        No custom aircraft saved yet.
                                    </div>
                                )}
                                {customAircraftRegistry.map((item) => (
                                    <div key={item.id} className="space-y-2 border border-white/10 bg-black/30 p-3">
                                        <button
                                            className="block w-full text-left"
                                            onClick={() => void selectCustomAircraft(item.id)}
                                        >
                                            <div className="text-xs font-mono text-white">{item.name}</div>
                                            <div className="text-[10px] font-mono uppercase text-white/50">
                                                {item.stability_mode} / {item.classification}
                                            </div>
                                        </button>
                                        <div className="flex gap-2 text-[10px] font-mono uppercase">
                                            <button onClick={() => openEditor(item)}           className="border border-white/10 px-2 py-1 text-white/70 hover:bg-white/5">Edit</button>
                                            <button onClick={() => duplicateCustomAircraft(item.id)} className="border border-white/10 px-2 py-1 text-white/70 hover:bg-white/5">Dupe</button>
                                            <button onClick={() => handleExport(item)}         className="border border-white/10 px-2 py-1 text-white/70 hover:bg-white/5">Export</button>
                                            {confirmDeleteId === item.id ? (
                                                <>
                                                    <button onClick={() => { deleteCustomAircraft(item.id); setConfirmDeleteId(null); }} className="border border-red-500/40 px-2 py-1 text-red-300">Yes</button>
                                                    <button onClick={() => setConfirmDeleteId(null)} className="border border-white/10 px-2 py-1 text-white/50">No</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteId(item.id)} className="border border-red-500/20 px-2 py-1 text-red-300">Del</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Computed metrics */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <MetricCard label="Trim alpha"        value={fmt(computed.trim?.alpha_rad, 4)} />
                            <MetricCard label="Trim elevator"     value={fmt(computed.trim?.elevator_rad, 4)} />
                            <MetricCard label="Spectral margin"   value={fmt(metrics.spectral_margin, 4)} />
                            <MetricCard label="Short-period zeta" value={fmt(metrics.short_period_damping, 3)} />
                            <MetricCard label="Phugoid period"    value={metrics.phugoid_period_s == null          ? "--" : `${fmt(metrics.phugoid_period_s, 2)} s`} />
                            <MetricCard label="Roll tau"          value={metrics.roll_time_constant_s == null      ? "--" : `${fmt(metrics.roll_time_constant_s, 2)} s`} />
                            <MetricCard label="Spiral tau"        value={metrics.spiral_time_constant_s == null    ? "--" : `${fmt(metrics.spiral_time_constant_s, 2)} s`} />
                        </div>

                        {/* Dataset detail — sits flush at the bottom of the right column,
                            aligned with the Data Source card at the bottom of the left */}
                        <div className="mt-auto">
                            <HangarMetadata />
                        </div>
                    </div>
                </div>

                {/* Custom editor — collapses below main grid */}
                {showEditor && (
                    <div
                        id="custom-editor"
                        className="hud-panel space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="mb-1 text-[10px] uppercase text-white/40">Custom Aircraft Editor</div>
                                <div className="text-sm font-mono text-white">{draft.name}</div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setDraft(makeDefaultCustomAircraft()); setDraftErrors([]); }}
                                    className="border border-white/10 px-3 py-2 text-[10px] font-mono uppercase text-white/70 hover:bg-white/5"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="border border-white/10 px-3 py-2 text-[10px] font-mono uppercase text-white/70 hover:bg-white/5"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <Field label="Name"           value={draft.name}                onChange={(v) => setDraft((p) => ({ ...p, name: v }))} />
                            <Field label="Classification" value={draft.classification}      onChange={(v) => setDraft((p) => ({ ...p, classification: v }))} />
                            <Field label="Stability mode" value={draft.stability_mode}      onChange={(v) => setDraft((p) => ({ ...p, stability_mode: v as CustomAircraftDefinition["stability_mode"] }))} />
                            <Field label="Notes"          value={draft.metadata.notes ?? ""} onChange={(v) => setDraft((p) => ({ ...p, metadata: { ...p.metadata, notes: v } }))} />
                            {groupedFields.map((field, index) => (
                                <Field
                                    key={String(field[0]) + index}
                                    label={String(field[0])}
                                    value={field[1] as number}
                                    onChange={field[2] as (v: string) => void}
                                />
                            ))}
                        </div>

                        {draftErrors.length > 0 && (
                            <div className="space-y-1 border border-red-500/20 bg-red-500/5 p-4 text-xs font-mono text-red-300">
                                {draftErrors.map((message) => <div key={message}>{message}</div>)}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => saveCustomAircraft(draft)}
                                className="border border-white/10 px-4 py-3 text-xs font-mono uppercase tracking-widest text-white/80 hover:bg-white/5"
                            >
                                Save Local
                            </button>
                            <button
                                onClick={() => void handleAnalyzeDraft()}
                                className="border border-white/20 bg-white/5 px-4 py-3 text-xs font-mono uppercase tracking-widest text-white hover:bg-white/10"
                            >
                                Analyze Custom Aircraft
                            </button>
                        </div>
                    </div>
                )}


            </main>
        </div>
    );
}
function MetricBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <div className="text-[8px] uppercase text-white/40 font-mono mb-1 font-bold tracking-wider">{label}</div>
            <div className="text-[12px] font-bold text-cyan-100/90 font-mono tracking-tight">{value}</div>
        </div>
    );
}
