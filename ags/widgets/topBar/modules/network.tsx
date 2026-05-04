// @ts-ignore
import Network from "gi://AstalNetwork"
import { createState, createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"

export default function Internet() {
  const network = Network.get_default()
  const [pinned, setPinned] = createState(false)
  const [hovered, setHovered] = createState(false)

  const getIcon = () => {
    try {
      if (!network) return "network-error-symbolic"
      if (network.primary === Network.Primary.WIRED) return "network-wired-symbolic"
      if (network.wifi?.icon_name) return network.wifi.icon_name
      return "network-error-symbolic"
    } catch (_) {
      return "network-error-symbolic"
    }
  }

  const getLabel = () => {
    try {
      if (!network) return ""
      if (network.primary === Network.Primary.WIRED) return "Wired"
      const wifi = network.wifi
      if (!wifi) return ""
      switch (wifi.internet) {
        case Network.Internet.CONNECTED: return wifi.ssid ?? ""
        case Network.Internet.CONNECTING: return "Connecting..."
        case Network.Internet.DISCONNECTED: return "Disconnected"
        default: return ""
      }
    } catch (_) {
      return ""
    }
  }

  const getVisible = () => {
    try {
      if (!network) return false
      const c = network.connectivity
      return c !== Network.Connectivity.NONE && c !== Network.Connectivity.LOCAL
    } catch (_) {
      return false
    }
  }

  // Poll every second to recover gracefully after NetworkManager restarts
  const icon = createPoll("network-error-symbolic", 1000, getIcon)
  const label = createPoll("", 1000, getLabel)
  const visible = createPoll(false, 1000, getVisible)

  const showLabel = createComputed(
    [pinned, hovered],
    (p, h) => p || h
  )

  const motionController = new Gtk.EventControllerMotion()
  motionController.connect("enter", () => setHovered(true))
  motionController.connect("leave", () => setHovered(false))

  return (
    <button
      cssClasses={["bar-nw"]}
      visible={visible}
      onClicked={() => {
        const next = !pinned()
        setPinned(next)
        if (!next) setHovered(false)
      }}
      $={(self) => self.add_controller(motionController)}
    >
      <box>
        <image iconName={icon} />
        <revealer
          revealChild={showLabel}
          transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
          transitionDuration={200}
        >
          <label label={label(l => " " + l)} />
        </revealer>
      </box>
    </button>
  )
}
