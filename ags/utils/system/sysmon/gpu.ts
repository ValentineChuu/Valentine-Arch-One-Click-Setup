import { register, property } from "ags/gobject"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio"
import { exec, execAsync } from "ags/process"
import { HardwareMonitor, safeReadFile } from "./base"

@register({ GTypeName: "TopBarBaseGpuMonitor" })
export class BaseGpuMonitor extends HardwareMonitor {
  @property(Boolean) detected = false
  @property(Number) utilization = 0
  @property(Number) temperature = 0

  initialize(): void {
    this.startMonitoring(1000)
  }

  async update(): Promise<void> { }
}

/** Polls nvidia-smi for utilization and temperature. */
@register({ GTypeName: "TopBarNvidiaGpuMonitor" })
export class NvidiaGpuMonitor extends BaseGpuMonitor {
  async update(): Promise<void> {
    try {
      const output = await execAsync(
        "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits"
      )
      const [util, temp] = output.trim().split(",").map(Number)
      if (!isNaN(util)) this.utilization = util / 100
      if (!isNaN(temp)) this.temperature = temp
    } catch (e) {
      console.error("nvidia-smi failed:", e)
    }
  }
}

/** Reads sysfs gpu_busy_percent and hwmon temperature for AMD GPUs. */
@register({ GTypeName: "TopBarAmdGpuMonitor" })
export class AmdGpuMonitor extends BaseGpuMonitor {
  constructor(
    private busyPath: string,
    private tempPath: string | null = null
  ) {
    super()
  }

  async update(): Promise<void> {
    const busy = await safeReadFile(this.busyPath)
    if (busy) this.utilization = parseInt(busy.trim()) / 100

    if (this.tempPath) {
      const temp = await safeReadFile(this.tempPath)
      if (temp) this.temperature = parseInt(temp.trim()) / 1000
    }
  }
}

/**
 * Auto-detect the GPU vendor and return the appropriate monitor.
 * Checks Nvidia first (nvidia-smi is unambiguous), then scans
 * /sys/class/drm for AMD cards, preferring the one with the most VRAM.
 */
export function createGpuMonitor(): BaseGpuMonitor {
  // --- Nvidia ---
  if (GLib.find_program_in_path("nvidia-smi") !== null) {
    try {
      exec("nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits")
      const monitor = new NvidiaGpuMonitor()
      monitor.detected = true
      monitor.initialize()
      return monitor
    } catch (_) { }
  }

  // --- AMD (sysfs) ---
  const drmPath = "/sys/class/drm"
  if (GLib.file_test(drmPath, GLib.FileTest.IS_DIR)) {
    try {
      const dir = Gio.File.new_for_path(drmPath)
      const enumerator = dir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)

      let bestCard: { busyPath: string, tempPath: string | null, vram: number } | null = null

      for (const info of enumerator) {
        const name = info.get_name()
        if (!/^card\d+$/.test(name)) continue
        const devicePath = `${drmPath}/${name}/device`
        const busyPath = `${devicePath}/gpu_busy_percent`
        if (!GLib.file_test(busyPath, GLib.FileTest.EXISTS)) continue

        // Read VRAM to identify the dominant GPU when multiple cards exist
        const memTotalPath = `${devicePath}/mem_info_vram_total`
        let vram = 0
        if (GLib.file_test(memTotalPath, GLib.FileTest.EXISTS)) {
          try {
            const content = GLib.file_get_contents(memTotalPath)
            vram = parseInt(content[1].toString().trim()) || 0
          } catch (_) { }
        }

        // Find the hwmon temperature sensor for this card
        let tempPath: string | null = null
        const hwmonPath = `${devicePath}/hwmon`
        if (GLib.file_test(hwmonPath, GLib.FileTest.IS_DIR)) {
          const hwmonDir = Gio.File.new_for_path(hwmonPath)
          const hwmonEnum = hwmonDir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)
          for (const hwInfo of hwmonEnum) {
            const tp = `${hwmonPath}/${hwInfo.get_name()}/temp1_input`
            if (GLib.file_test(tp, GLib.FileTest.EXISTS)) { tempPath = tp; break }
          }
        }

        if (!bestCard || vram > bestCard.vram) {
          bestCard = { busyPath, tempPath, vram }
        }
      }

      if (bestCard) {
        const monitor = new AmdGpuMonitor(bestCard.busyPath, bestCard.tempPath)
        monitor.detected = true
        monitor.initialize()
        return monitor
      }
    } catch (e) {
      console.error("AMD GPU detection failed:", e)
    }
  }

  // --- Fallback (no GPU detected) ---
  console.warn("No supported GPU detected")
  const monitor = new BaseGpuMonitor()
  monitor.initialize()
  return monitor
}
