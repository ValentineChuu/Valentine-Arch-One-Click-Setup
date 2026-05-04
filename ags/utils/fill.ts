import { createState, createEffect, onCleanup } from "ags"
import GLib from "gi://GLib"

// ── Hardcoded animation constants ───────────────────────────────────

const TICK_MS = 50
const LERP_SPEED = 0.15
const WAVE_DECAY = 0.90
const WAVE_SPEED = 0.15
const WAVE_KICK = 0.6
const WAVE_FREQ = 2.0
const COLUMNS = 8

/** Single flat gradient at a given fill %. */
function flatCss(fill: number): string {
  return `background-image: linear-gradient(to top, var(--accent) ${fill}%, var(--fg) ${fill}%);`
}

/** Multi-column tiled gradients forming a wave surface. */
function waveCss(
  level: number,
  amplitude: number,
  phase: number,
): string {
  const slices: string[] = []
  const colWidth = 100 / COLUMNS

  for (let i = 0; i < COLUMNS; i++) {
    const normX = (i + 0.5) / COLUMNS
    const waveOffset = amplitude * Math.sin(normX * Math.PI * 2 * WAVE_FREQ + phase)
    const fill = Math.max(0, Math.min(100, Math.round((level + waveOffset) * 100)))
    slices.push(
      `linear-gradient(to top, var(--accent) ${fill}%, var(--fg) ${fill}%)`
    )
  }

  const sizes = Array(COLUMNS).fill(`${colWidth}% 100%`).join(', ')
  const positions = Array.from({ length: COLUMNS }, (_, i) =>
    `${Math.round(i * colWidth)}% 0%`
  ).join(', ')

  return `
    background-image: ${slices.join(', ')};
    background-size: ${sizes};
    background-position: ${positions};
    background-repeat: no-repeat;
  `
}

/**
 * Create a reactive CSS accessor that smoothly animates a fill level.
 *
 * @param percentage - Accessor<number> (0–1)
 * @param wave - whether to enable wave animation
 * @returns Accessor<string> for the `css` prop
 */
export function createFillAnimation(
  percentage: any,
  wave: boolean,
) {
  let target = 0
  let level = 0
  let amplitude = 0
  let phase = 0
  let tickId: number | null = null
  let settled = true

  const [css, setCss] = createState(flatCss(0))

  function stopTick() {
    if (tickId !== null) {
      GLib.source_remove(tickId)
      tickId = null
    }
  }

  function startTick() {
    if (tickId !== null) return
    settled = false

    tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
      const diff = target - level
      if (Math.abs(diff) < 0.002) {
        level = target
      } else {
        level = level + diff * LERP_SPEED
      }

      if (wave && amplitude > 0) {
        phase += WAVE_SPEED
        amplitude *= WAVE_DECAY
        if (amplitude < 0.005) amplitude = 0
      }

      const isSettled = Math.abs(target - level) < 0.002
        && (!wave || amplitude === 0)

      if (isSettled && !settled) {
        settled = true
        level = target
        setCss(flatCss(Math.max(0, Math.min(100, Math.round(level * 100)))))
        tickId = null
        return GLib.SOURCE_REMOVE
      }

      if (wave && amplitude > 0) {
        setCss(waveCss(level, amplitude, phase))
      } else {
        setCss(flatCss(Math.max(0, Math.min(100, Math.round(level * 100)))))
      }

      return GLib.SOURCE_CONTINUE
    })
  }

  createEffect(() => {
    const newTarget = percentage()
    const jump = Math.abs(newTarget - target)
    if (wave && jump > 0.01) {
      amplitude = Math.min(amplitude + jump * WAVE_KICK, 0.15)
    }
    target = newTarget
    startTick()
  })

  onCleanup(() => stopTick())

  return css
}