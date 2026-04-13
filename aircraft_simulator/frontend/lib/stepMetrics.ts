export interface StepResponseMetrics {
  peakOvershoot: number;
  settlingTime: number | null;
  steadyStateError: number;
  peakTime: number;
  peakValue: number;
  steadyStateValue: number;
  riseTime: number | null;
}

export interface StepResponseTrace {
  time: number[];
  values: number[];
  reference: number;
}

export function computeStepMetrics(trace: StepResponseTrace): StepResponseMetrics {
  const { time, values, reference } = trace;
  const n = values.length;

  if (n < 4) {
    return {
      peakOvershoot: 0,
      settlingTime: null,
      steadyStateError: 0,
      peakTime: 0,
      peakValue: values[0] ?? 0,
      steadyStateValue: values[n - 1] ?? 0,
      riseTime: null,
    };
  }

  const tailStart = Math.floor(n * 0.9);
  const tail = values.slice(tailStart);
  const steadyStateValue = tail.reduce((sum, value) => sum + value, 0) / Math.max(1, tail.length);

  const initialValue = values[0];
  const stepMagnitude = steadyStateValue - initialValue;

  let peakIdx = 0;
  if (stepMagnitude >= 0) {
    for (let i = 1; i < n; i += 1) {
      if (values[i] > values[peakIdx]) peakIdx = i;
    }
  } else {
    for (let i = 1; i < n; i += 1) {
      if (values[i] < values[peakIdx]) peakIdx = i;
    }
  }

  const peakValue = values[peakIdx];
  const peakTime = time[peakIdx];
  const overshootAbsolute = stepMagnitude >= 0 ? peakValue - steadyStateValue : steadyStateValue - peakValue;
  const peakOvershoot = Math.abs(stepMagnitude) > 1e-9 ? (overshootAbsolute / Math.abs(stepMagnitude)) * 100 : 0;

  const band = 0.02 * Math.abs(stepMagnitude);
  let settlingTime: number | null = null;
  if (band > 1e-12) {
    let lastOutside = -1;
    for (let i = 0; i < n; i += 1) {
      if (Math.abs(values[i] - steadyStateValue) > band) lastOutside = i;
    }
    if (lastOutside === -1) {
      settlingTime = time[0];
    } else if (lastOutside < n - 1) {
      settlingTime = time[lastOutside + 1];
    }
  }

  const level10 = initialValue + 0.1 * stepMagnitude;
  const level90 = initialValue + 0.9 * stepMagnitude;
  let t10: number | null = null;
  let t90: number | null = null;
  for (let i = 0; i < n - 1; i += 1) {
    const v0 = values[i];
    const v1 = values[i + 1];
    const t0 = time[i];
    const t1 = time[i + 1];
    if (t10 === null && crossesLevel(v0, v1, level10, stepMagnitude)) {
      t10 = interpolateTime(v0, v1, t0, t1, level10);
    }
    if (t90 === null && crossesLevel(v0, v1, level90, stepMagnitude)) {
      t90 = interpolateTime(v0, v1, t0, t1, level90);
    }
    if (t10 !== null && t90 !== null) break;
  }
  const riseTime = t10 !== null && t90 !== null ? t90 - t10 : null;
  const steadyStateError = Math.abs(reference - steadyStateValue);

  return {
    peakOvershoot: +peakOvershoot.toFixed(2),
    settlingTime: settlingTime !== null ? +settlingTime.toFixed(3) : null,
    steadyStateError: +steadyStateError.toFixed(4),
    peakTime: +peakTime.toFixed(3),
    peakValue: +peakValue.toFixed(4),
    steadyStateValue: +steadyStateValue.toFixed(4),
    riseTime: riseTime !== null ? +riseTime.toFixed(3) : null,
  };
}

function crossesLevel(v0: number, v1: number, level: number, stepMagnitude: number): boolean {
  return stepMagnitude >= 0 ? v0 < level && v1 >= level : v0 > level && v1 <= level;
}

function interpolateTime(v0: number, v1: number, t0: number, t1: number, level: number): number {
  if (Math.abs(v1 - v0) < 1e-12) return t0;
  return t0 + ((level - v0) / (v1 - v0)) * (t1 - t0);
}
