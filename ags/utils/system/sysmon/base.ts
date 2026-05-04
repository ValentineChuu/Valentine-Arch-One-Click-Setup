import GObject, { register } from "ags/gobject"
import GLib from "gi://GLib?version=2.0"
import { readFileAsync } from "ags/file"

/** Base class for all polled hardware monitors. */
@register()
export class HardwareMonitor extends GObject.Object {
  protected intervalId: number | null = null
  protected destroyed = false

  async update(): Promise<void> {
    throw new Error("update() must be implemented by subclass")
  }

  protected startMonitoring(interval: number): void {
    if (this.intervalId !== null) return
    this.intervalId = GLib.timeout_add(GLib.PRIORITY_LOW, interval, () => {
      if (this.destroyed) return GLib.SOURCE_REMOVE
      this.update().catch((e) => console.error(`${this.constructor.name} update failed:`, e))
      return GLib.SOURCE_CONTINUE
    })
  }

  destroy(): void {
    this.destroyed = true
    if (this.intervalId !== null) {
      GLib.source_remove(this.intervalId)
      this.intervalId = null
    }
  }
}

/** Read a sysfs file, returning null on missing path or read failure. */
export async function safeReadFile(path: string): Promise<string | null> {
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) return null
  try {
    return await readFileAsync(path)
  } catch (_) {
    return null
  }
}

/** Division that returns 0 when the denominator is non-positive. */
export function safeDivide(a: number, b: number): number {
  return b > 0 ? a / b : 0
}
