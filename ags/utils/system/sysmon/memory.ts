// @ts-ignore
import GTop from "gi://GTop"
import { register, property } from "ags/gobject"
import { HardwareMonitor, safeDivide } from "./base"

@register({ GTypeName: "TopBarMemoryMonitor" })
export class MemoryMonitor extends HardwareMonitor {
  private mem = new GTop.glibtop_mem()

  @property(Number) utilization = 0
  @property(String) used = "0"
  @property(String) total = "0"

  initialize(): void {
    this.startMonitoring(1000)
  }

  async update(): Promise<void> {
    GTop.glibtop_get_mem(this.mem)
    this.utilization = safeDivide(this.mem.user, this.mem.total)
    this.used = (this.mem.user / 1024 / 1024 / 1024).toFixed(1)
    this.total = (this.mem.total / 1024 / 1024 / 1024).toFixed(1)
  }
}
