import { createState, createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import GObject, { register } from "ags/gobject"
import { CpuMonitor } from "../../../utils/system/sysmon/cpu"
import { MemoryMonitor } from "../../../utils/system/sysmon/memory"
import { createGpuMonitor, BaseGpuMonitor } from "../../../utils/system/sysmon/gpu"
import Hyprland from "../../../utils/system/hyprland"
import Configs from "../../../utils/config"
import { createFillAnimation } from "../../../utils/fill"

@register({ GTypeName: "TopBarSystemMonitor" })
class SystemMonitor extends GObject.Object {
  static instance: SystemMonitor

  readonly cpu = new CpuMonitor()
  readonly memory = new MemoryMonitor()
  readonly gpu: BaseGpuMonitor

  constructor() {
    super()
    this.gpu = createGpuMonitor()
    this.cpu.initialize()
    this.memory.initialize()
  }

  static get_default(): SystemMonitor {
    return this.instance || (this.instance = new SystemMonitor())
  }
}

function HardwareLabel({
  icon,
  percentage,
  tooltip,
  onClick,
}: {
  icon: string
  percentage: any
  tooltip: string | any
  onClick: () => void
}) {
  const css = createFillAnimation(percentage, Configs.hardware.wave_monitor)

  return (
    <button
      tooltipText={tooltip}
      onClicked={onClick}
      css={css}
    >
      <box
        widthRequest={16}
        heightRequest={16}
        cssClasses={[icon]}
      >
        <label label={icon} />
      </box>
    </button>
  )
}

export default function Hardware() {
  const sysmon = SystemMonitor.get_default()
  const [expanded, setExpanded] = createState(false)

  return (
    <box cssClasses={["bar-hw"]}>
      <revealer
        revealChild={createBinding(sysmon.gpu, "detected")(d => d && expanded())}
        transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={200}
      >
        <box spacing={4} marginEnd={4}>
          {/* GPU — hidden when no supported GPU is detected */}
          <HardwareLabel
            icon="󰢮"
            percentage={createBinding(sysmon.gpu, "utilization")}
            tooltip={createBinding(sysmon.gpu, "temperature")((t) => `GPU ${Math.round(t)}°C`)}
            onClick={() => Hyprland.dispatch("togglespecialworkspace", "terminal")}
          />

          {/* RAM */}
          <HardwareLabel
            icon=""
            percentage={createBinding(sysmon.memory, "utilization")}
            tooltip={createBinding(sysmon.memory, "used")(() => `${sysmon.memory.used}GB / ${sysmon.memory.total}GB`)}
            onClick={() => Hyprland.dispatch("togglespecialworkspace", "terminal")}
          />
        </box>
      </revealer>

      {/* CPU — always visible; clicking toggles GPU/RAM visibility */}
      <HardwareLabel
        icon=""
        percentage={createBinding(sysmon.cpu, "load")}
        tooltip={createBinding(sysmon.cpu, "temperature")((t) => `CPU ${Math.round(t)}°C`)}
        onClick={() => setExpanded(!expanded())}
      />

    </box>
  )
}
