// @ts-ignore
import Cava from "gi://AstalCava";

// ── Types ───────────────────────────────────────────────────────────

export type ChannelMode = "mono" | "stereo";

export type VisualizerType =
  | "wave"
  | "catmull-rom"
  | "bars"
  | "dots"
  | "jumping-bars";

type RGBA = [number, number, number, number];

export interface FrequencyLayer {
  name: string;
  lowCutoff: number;
  highCutoff: number;
  color: RGBA;
}

export interface CavaConfig {
  channelMode: ChannelMode;
  visualizer: VisualizerType;
  layers: FrequencyLayer[];
  bars: number;
  layerColors: boolean;
  colors: RGBA;
}

export interface CavaLayer {
  name: string;
  color: RGBA;
  cava: InstanceType<typeof Cava.Cava>;
  peakState: PeakState;
}

// ── Hardcoded constants ─────────────────────────────────────────────

const FRAMERATE = 60;
const NOISE_REDUCTION = 0.3;

// ── Color resolution ────────────────────────────────────────────────

interface ResolvedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function rgbaToColor(c: RGBA): ResolvedColor {
  return { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255, a: c[3] };
}

function resolveColor(cfg: CavaConfig, layer: CavaLayer): ResolvedColor {
  if (cfg.layerColors) {
    return rgbaToColor(layer.color);
  }
  return rgbaToColor(cfg.colors);
}

// ── Peak normalization ──────────────────────────────────────────────

interface PeakState {
  peak: number;
}

const DECAY = 0.995;

function normalizeValues(raw: number[], state: PeakState): number[] {
  let max = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] > max) max = raw[i];
  }
  if (max > state.peak) {
    state.peak = max;
  } else {
    state.peak *= DECAY;
    if (state.peak < 0.0001) state.peak = 0.0001;
  }
  const result: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    result.push(Math.min(raw[i] / state.peak, 1.0));
  }
  return result;
}

// ── Layer init ──────────────────────────────────────────────────────

export function initLayers(cfg: CavaConfig): CavaLayer[] {
  return cfg.layers.map((layer) => {
    const inst = new Cava.Cava({
      bars: cfg.bars,
      low_cutoff: layer.lowCutoff,
      high_cutoff: layer.highCutoff,
      framerate: FRAMERATE,
      noise_reduction: NOISE_REDUCTION,
      stereo: cfg.channelMode !== "mono",
    });
    return {
      name: layer.name,
      color: layer.color,
      cava: inst,
      peakState: { peak: 0.0001 },
    };
  });
}

// ── Visualizers ─────────────────────────────────────────────────────

function drawWave(cr: any, values: number[], x: number, w: number, h: number) {
  const n = values.length;
  if (n < 2) return;
  const step = w / (n - 1);

  cr.moveTo(x, h);
  cr.lineTo(x, h - values[0] * h);
  for (let i = 0; i < n - 1; i++) {
    const x0 = x + i * step;
    const x1 = x + (i + 1) * step;
    const y0 = h - values[i] * h;
    const y1 = h - values[i + 1] * h;
    cr.curveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1);
  }
  cr.lineTo(x + w, h);
  cr.closePath();
}

function drawCatmullRom(cr: any, values: number[], x: number, w: number, h: number) {
  const n = values.length;
  if (n < 2) return;
  const step = w / (n - 1);

  cr.moveTo(x, h);
  cr.lineTo(x, h - values[0] * h);
  for (let i = 0; i < n - 1; i++) {
    const p0i = Math.max(i - 1, 0);
    const p3i = Math.min(i + 2, n - 1);
    const p0y = h - values[p0i] * h;
    const p1x = x + i * step;
    const p1y = h - values[i] * h;
    const p2x = x + (i + 1) * step;
    const p2y = h - values[i + 1] * h;
    const p3y = h - values[p3i] * h;

    cr.curveTo(
      p1x + (p2x - (x + p0i * step)) / 6,
      p1y + (p2y - p0y) / 6,
      p2x - ((x + p3i * step) - p1x) / 6,
      p2y - (p3y - p1y) / 6,
      p2x, p2y,
    );
  }
  cr.lineTo(x + w, h);
  cr.closePath();
}

function drawBars(cr: any, values: number[], x: number, w: number, h: number) {
  const n = values.length;
  if (n === 0) return;
  const gap = 2;
  const barW = Math.max((w - gap * (n - 1)) / n, 1);
  for (let i = 0; i < n; i++) {
    const bh = values[i] * h;
    cr.rectangle(x + i * (barW + gap), h - bh, barW, bh);
  }
}

function drawDots(cr: any, values: number[], x: number, w: number, h: number) {
  const n = values.length;
  if (n === 0) return;
  const step = n > 1 ? w / (n - 1) : w;
  const radius = Math.max(step * 0.25, 1.5);
  for (let i = 0; i < n; i++) {
    cr.arc(x + i * step, h - values[i] * h, radius, 0, 2 * Math.PI);
    cr.closePath();
  }
}

function drawJumpingBars(cr: any, values: number[], x: number, w: number, h: number) {
  const n = values.length;
  if (n === 0) return;
  const gap = 2;
  const barW = Math.max((w - gap * (n - 1)) / n, 1);
  for (let i = 0; i < n; i++) {
    const bx = x + i * (barW + gap);
    const bh = values[i] * h;
    cr.rectangle(bx, h - bh, barW, bh);
    cr.rectangle(bx, h - bh - 3, barW, 2);
  }
}

const visualizers: Record<VisualizerType, typeof drawWave> = {
  "wave": drawWave,
  "catmull-rom": drawCatmullRom,
  "bars": drawBars,
  "dots": drawDots,
  "jumping-bars": drawJumpingBars,
};

// ── Main draw ───────────────────────────────────────────────────────

export function drawLayerCava(
  cr: any,
  cfg: CavaConfig,
  layer: CavaLayer,
  width: number,
  height: number,
  borderRadius: number = 0,
) {
  const rawValues = layer.cava.get_values();
  if (!rawValues || rawValues.length === 0) return;

  if (borderRadius > 0) {
    const r = Math.min(borderRadius, width / 2, height / 2);
    cr.newPath();
    cr.arc(r, r, r, Math.PI, 1.5 * Math.PI);
    cr.arc(width - r, r, r, 1.5 * Math.PI, 2 * Math.PI);
    cr.arc(width - r, height - r, r, 0, 0.5 * Math.PI);
    cr.arc(r, height - r, r, 0.5 * Math.PI, Math.PI);
    cr.closePath();
    cr.clip();
  }

  const raw = Array.from(rawValues) as number[];
  const draw = visualizers[cfg.visualizer] ?? drawWave;
  const normalized = normalizeValues(raw, layer.peakState);
  const color = resolveColor(cfg, layer);

  cr.save();
  draw(cr, normalized, 0, width, height);
  cr.setSourceRGBA(color.r, color.g, color.b, color.a);
  cr.fill();
  cr.restore();
}