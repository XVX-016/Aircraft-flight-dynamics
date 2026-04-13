import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ControlPage from "../page";

vi.mock("@/components/analysis/SpectralPlot", () => ({
    SpectralPlot: ({ title }: { title: string }) => <div data-testid="spectral-plot">{title}</div>,
}));

vi.mock("@/components/analysis/TimeSeriesPlot", () => ({
    TimeSeriesPlot: ({ title }: { title: string }) => <div data-testid="time-series-plot">{title}</div>,
}));

type ContextOverrides = {
    selectedAircraftId?: string | null;
    flightCondition?: Record<string, number>;
    getCachedAnalysis?: (key: string) => unknown;
    runControlAnalysis?: () => Promise<void>;
    runStepResponse?: () => Promise<void>;
    setFlightCondition?: () => void;
};

const DEFAULT_FLIGHT_CONDITION = {
    velocity: 60,
    altitude: 1000,
    isaTempOffsetC: 0,
    headwind: 0,
    crosswind: 0,
};

function makeContext(overrides: ContextOverrides = {}) {
    return {
        selectedAircraftId: "cessna-172r",
        flightCondition: DEFAULT_FLIGHT_CONDITION,
        setFlightCondition: vi.fn(),
        getCachedAnalysis: vi.fn().mockReturnValue(undefined),
        runControlAnalysis: vi.fn().mockResolvedValue(undefined),
        runStepResponse: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

const mockUseAircraftContext = vi.fn();

vi.mock("@/context/AircraftContext", () => ({
    useAircraftContext: () => mockUseAircraftContext(),
}));

beforeEach(() => {
    vi.clearAllMocks();
    mockUseAircraftContext.mockReturnValue(makeContext());
});

function makeStepPayload() {
    const n = 10;
    const time_s = Array.from({ length: n }, (_, i) => i * (30 / (n - 1)));
    const airspeed = Array.from({ length: n }, (_, i) => 60 + i * 0.5);
    const pitch = Array.from({ length: n }, (_, i) => 0.03 + i * 0.001);
    const pitch_rate = Array.from({ length: n }, () => 0.01);
    const ground_dist = Array.from({ length: n }, (_, i) => i * 100);
    const altitude = Array.from({ length: n }, (_, i) => 1000 + i * 2);
    return {
        time_s,
        traces: {
            open_loop: {
                airspeed_mps: airspeed,
                pitch_rad: pitch,
                altitude_m: altitude,
            },
            closed_loop: {
                airspeed_mps: airspeed,
                pitch_rad: pitch,
                pitch_rate_radps: pitch_rate,
                ground_distance_m: ground_dist,
                altitude_m: altitude,
            },
        },
        metrics: { control_effort_peak: 0.042 },
    };
}

function makeControlPayload() {
    return {
        open_loop: { max_real_eig: -0.011, eigenvalues: [] },
        closed_loop: { max_real_eig: -0.079, eigenvalues: [] },
        trim: { throttle: 0.236, elevator_rad: -0.018 },
    };
}

describe("no aircraft selected", () => {
    beforeEach(() => {
        mockUseAircraftContext.mockReturnValue(makeContext({ selectedAircraftId: null }));
    });

    it("renders the empty-state prompt", () => {
        render(<ControlPage />);
        expect(screen.getByText(/no aircraft selected/i)).toBeInTheDocument();
    });

    it("does not call runControlAnalysis or runStepResponse", () => {
        const ctx = makeContext({ selectedAircraftId: null });
        mockUseAircraftContext.mockReturnValue(ctx);
        render(<ControlPage />);
        expect(ctx.runControlAnalysis).not.toHaveBeenCalled();
        expect(ctx.runStepResponse).not.toHaveBeenCalled();
    });

    it("disables the Recompute button", () => {
        render(<ControlPage />);
        expect(screen.getByRole("button", { name: /recompute workbench/i })).toBeDisabled();
    });

    it("renders no metric cards", () => {
        render(<ControlPage />);
        expect(screen.queryByText(/open-loop sigma max/i)).toBeNull();
        expect(screen.queryByText(/airspeed overshoot/i)).toBeNull();
    });
});

describe("loading state", () => {
    it("shows Computing... on the button while fetch is in flight", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn(() => new Promise(() => {})),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /computing/i })).toBeInTheDocument();
        });
    });

    it("disables the Recompute button while loading", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn(() => new Promise(() => {})),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /computing/i })).toBeDisabled();
        });
    });

    it("does not render step-response metric cards while loading", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn(() => new Promise(() => {})),
            getCachedAnalysis: vi.fn().mockReturnValue(undefined),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => {
            expect(screen.queryByText(/airspeed overshoot/i)).toBeNull();
        });
    });

    it("clears a previous error when a new fetch starts", async () => {
        const failCtx = makeContext({
            runControlAnalysis: vi.fn().mockRejectedValue(new Error("timeout")),
        });
        mockUseAircraftContext.mockReturnValue(failCtx);
        const { rerender } = render(<ControlPage />);
        await waitFor(() => expect(screen.getByText(/timeout/i)).toBeInTheDocument());

        const loadingCtx = makeContext({
            runControlAnalysis: vi.fn(() => new Promise(() => {})),
        });
        mockUseAircraftContext.mockReturnValue(loadingCtx);
        rerender(<ControlPage />);
        fireEvent.click(screen.getByRole("button", { name: /computing/i }));

        await waitFor(() => expect(screen.queryByText(/timeout/i)).toBeNull());
    });
});

describe("error state", () => {
    it("displays the error message when runControlAnalysis rejects", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn().mockRejectedValue(new Error("Backend unavailable")),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument());
    });

    it("displays the error message when runStepResponse rejects", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn().mockResolvedValue(undefined),
            runStepResponse: vi.fn().mockRejectedValue(new Error("Step response failed")),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/step response failed/i)).toBeInTheDocument());
    });

    it('shows "Backend unavailable" for a non-Error throw', async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn().mockRejectedValue("raw string throw"),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument());
    });

    it("restores the Recompute button after a failed fetch", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn().mockRejectedValue(new Error("fail")),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByRole("button", { name: /recompute workbench/i })).not.toBeDisabled());
    });

    it("renders no analysis panels when fetch fails with empty cache", async () => {
        const ctx = makeContext({
            runControlAnalysis: vi.fn().mockRejectedValue(new Error("fail")),
            getCachedAnalysis: vi.fn().mockReturnValue(undefined),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
        expect(screen.queryByText(/open-loop sigma max/i)).toBeNull();
        expect(screen.queryByText(/airspeed overshoot/i)).toBeNull();
    });
});

describe("empty cache state", () => {
    it("renders no control metric cards when getCachedAnalysis returns undefined", async () => {
        const ctx = makeContext({
            getCachedAnalysis: vi.fn().mockReturnValue(undefined),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByRole("button", { name: /recompute workbench/i })).not.toBeDisabled());
        expect(screen.queryByText(/open-loop sigma max/i)).toBeNull();
    });

    it("renders no step-response section when step cache is empty", async () => {
        const ctx = makeContext({
            getCachedAnalysis: vi.fn((key: string) => (key === "control" ? makeControlPayload() : undefined)),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/open-loop sigma max/i)).toBeInTheDocument());
        expect(screen.queryByText(/airspeed overshoot/i)).toBeNull();
        expect(screen.queryAllByTestId("time-series-plot")).toHaveLength(0);
    });

    it("shows -- for all metric cards when step traces are empty arrays", async () => {
        const emptyStep = {
            time_s: [],
            traces: { open_loop: {}, closed_loop: {} },
            metrics: {},
        };
        const ctx = makeContext({
            getCachedAnalysis: vi.fn((key: string) => (key === "stepResponse" ? emptyStep : undefined)),
        });
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByText(/airspeed overshoot/i)).toBeInTheDocument());
        const dashes = screen.getAllByText("--");
        expect(dashes.length).toBeGreaterThanOrEqual(4);
    });
});

describe("success state", () => {
    beforeEach(() => {
        const ctx = makeContext({
            getCachedAnalysis: vi.fn((key: string) => {
                if (key === "control") return makeControlPayload();
                if (key === "stepResponse") return makeStepPayload();
                return undefined;
            }),
        });
        mockUseAircraftContext.mockReturnValue(ctx);
    });

    it("renders all four control metric card labels", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getByText(/open-loop sigma max/i)).toBeInTheDocument());
        expect(screen.getByText(/closed-loop sigma max/i)).toBeInTheDocument();
        expect(screen.getByText(/trim throttle/i)).toBeInTheDocument();
        expect(screen.getByText(/trim elevator/i)).toBeInTheDocument();
    });

    it("renders all six step-response metric card labels", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getByText(/airspeed overshoot/i)).toBeInTheDocument());
        expect(screen.getByText(/airspeed settle/i)).toBeInTheDocument();
        expect(screen.getByText(/airspeed ss error/i)).toBeInTheDocument();
        expect(screen.getByText(/airspeed rise/i)).toBeInTheDocument();
        expect(screen.getByText(/pitch settle/i)).toBeInTheDocument();
        expect(screen.getByText(/peak control effort/i)).toBeInTheDocument();
    });

    it("renders three TimeSeriesPlot instances for step data", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getAllByTestId("time-series-plot")).toHaveLength(3));
    });

    it("renders the Trajectory Arc plot", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getByText("Trajectory Arc")).toBeInTheDocument());
    });

    it("renders the SpectralPlot for eigenvalue shift", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getByTestId("spectral-plot")).toBeInTheDocument());
    });

    it("trim throttle value is formatted to 3 decimal places", async () => {
        render(<ControlPage />);
        await waitFor(() => expect(screen.getByText("0.236")).toBeInTheDocument());
    });
});

describe("Recompute button", () => {
    it("calls both runControlAnalysis and runStepResponse on click", async () => {
        const ctx = makeContext();
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);

        await waitFor(() => expect(screen.getByRole("button", { name: /recompute workbench/i })).not.toBeDisabled());

        fireEvent.click(screen.getByRole("button", { name: /recompute workbench/i }));

        await waitFor(() => {
            expect(ctx.runControlAnalysis).toHaveBeenCalledTimes(2);
            expect(ctx.runStepResponse).toHaveBeenCalledTimes(2);
        });
    });

    it("passes current weight multipliers to runControlAnalysis", async () => {
        const ctx = makeContext();
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);
        await waitFor(() => expect(screen.getByRole("button", { name: /recompute workbench/i })).not.toBeDisabled());

        fireEvent.click(screen.getByRole("button", { name: /recompute workbench/i }));

        await waitFor(() =>
            expect(ctx.runControlAnalysis).toHaveBeenLastCalledWith({
                q_pitch_mult: 1.0,
                q_speed_mult: 1.0,
                r_effort_mult: 1.0,
            })
        );
    });

    it("passes current step channel to runStepResponse", async () => {
        const ctx = makeContext();
        mockUseAircraftContext.mockReturnValue(ctx);

        render(<ControlPage />);
        await waitFor(() => expect(screen.getByRole("button", { name: /recompute workbench/i })).not.toBeDisabled());

        fireEvent.click(screen.getByRole("button", { name: /recompute workbench/i }));

        await waitFor(() =>
            expect(ctx.runStepResponse).toHaveBeenLastCalledWith(
                expect.objectContaining({ input_channel: "elevator" })
            )
        );
    });
});
