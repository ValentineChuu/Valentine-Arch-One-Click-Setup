// @ts-ignore
import GTop from "gi://GTop"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio"
import { register, property } from "ags/gobject"
import { HardwareMonitor, safeReadFile } from "./base"

@register({ GTypeName: "TopBarCpuMonitor" })
export class CpuMonitor extends HardwareMonitor {
  private cpu = new GTop.glibtop_cpu()
  private lastUsed = 0
  private lastTotal = 0
  private tempPath: string | null = null

  @property(Number) load = 0
  @property(Number) temperature = 0

  async initialize(): Promise<void> {
    await this.detectTempSensor()
    this.startMonitoring(1000)
  }

  async update(): Promise<void> {
    GTop.glibtop_get_cpu(this.cpu)

    // Compute usage as a delta between ticks to get an accurate percentage
    const used = this.cpu.user + this.cpu.sys + this.cpu.nice + this.cpu.irq + this.cpu.softirq
    const total = used + this.cpu.idle + this.cpu.iowait
    const diffUsed = used - this.lastUsed
    const diffTotal = total - this.lastTotal

    this.load = diffTotal > 0 ? Math.min(1, Math.max(0, diffUsed / diffTotal)) : 0
    this.lastUsed = used
    this.lastTotal = total

    if (this.tempPath) {
      const temp = await safeReadFile(this.tempPath)
      if (temp) this.temperature = parseInt(temp.trim()) / 1000
    }
  }

  /** Walk /sys/class/hwmon looking for a coretemp / k10temp / zenpower sensor. */
  private async detectTempSensor(): Promise<void> {
    const hwmonPath = "/sys/class/hwmon"
    if (!GLib.file_test(hwmonPath, GLib.FileTest.IS_DIR)) return

    try {
      const dir = Gio.File.new_for_path(hwmonPath)
      const enumerator = dir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)
      for (const info of enumerator) {
        const sub = `${hwmonPath}/${info.get_name()}`
        const name = await safeReadFile(`${sub}/name`)
        if (!name) continue
        const n = name.trim().toLowerCase()
        if (n.includes("coretemp") || n.includes("k10temp") || n.includes("zenpower")) {
          const tempPath = `${sub}/temp1_input`
          if (GLib.file_test(tempPath, GLib.FileTest.EXISTS)) {
            this.tempPath = tempPath
            return
          }
        }
      }
    } catch (e) {
      console.error("CPU temp detection failed:", e)
    }
  }
}
