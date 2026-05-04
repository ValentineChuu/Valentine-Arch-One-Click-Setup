// @ts-ignore
import Network from "gi://AstalNetwork"
import GLib from "gi://GLib"
import app from "ags/gtk4/app"
import { createState, createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { stopWifiScan, setScanTimeoutId, setScanIntervalId, connectToNetwork, filterAccessPoints } from "../../../utils/system/wifi"
import AccessPoint from "./network/accessPoint"

export default function Wifi() {
  const network = Network.get_default()
  const [expanded, setExpanded] = createState(false)
  const [accessPoints, setAccessPoints] = createState<any[]>([])
  const [scanning, setScanning] = createState(false)
  const [enteringPassword, setEnteringPassword] = createState(false)

  // Reset when settings window closes
  app.connect("window-toggled", (_: any, window: any) => {
    if (window.name === "settings" && !window.visible) {
      setExpanded(false)
      setAccessPoints([])
      setScanning(false)
      setEnteringPassword(false)
    }
  })

  const icon = createBinding(network, "connectivity")(() => {
    try {
      if (!network.wifi) return "network-wireless-offline-symbolic"
      if (!network.wifi.enabled) return "network-wireless-disabled-symbolic"
      if (network.wifi.icon_name) return network.wifi.icon_name
      return "network-wireless-symbolic"
    } catch (_) {
      return "network-wireless-offline-symbolic"
    }
  })

  const ssid = createBinding(network, "connectivity")(() => {
    try {
      if (!network.wifi) return "Disconnected"
      if (!network.wifi.enabled) return "Disabled"
      switch (network.wifi.internet) {
        case Network.Internet.CONNECTED: return network.wifi.ssid ?? "Unknown"
        case Network.Internet.CONNECTING: return "Connecting..."
        case Network.Internet.DISCONNECTED: return "Disconnected"
        default: return "Disconnected"
      }
    } catch (_) {
      return "Disconnected"
    }
  })

  const toggleWifi = () => {
    try {
      const enabled = network.wifi?.enabled ?? false
      execAsync(`nmcli radio wifi ${enabled ? "off" : "on"}`).catch(console.error)
      if (enabled) collapseAndStopScan()
    } catch (e) {
      console.error("Failed to toggle wifi:", e)
    }
  }

  const doScan = () => {
    if (!network.wifi) return
    try {
      setScanning(true)
      network.wifi.scan()
      const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        try {
          setAccessPoints(filterAccessPoints(network))
        } catch (e) {
          console.error("Failed to get access points:", e)
        }
        setScanning(false)
        setScanTimeoutId(null)
        return false
      })
      setScanTimeoutId(id)
    } catch (e) {
      console.error("Failed to scan:", e)
      setScanning(false)
    }
  }

  const scanNetworks = () => {
    if (!network.wifi) return
    doScan()

    const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
      if (!expanded()) {
        setScanIntervalId(null)
        return false
      }
      if (!enteringPassword()) {
        doScan()
      }
      return true
    })
    setScanIntervalId(id)
  }

  const collapseAndStopScan = () => {
    setExpanded(false)
    stopWifiScan()
    setScanning(false)
    setAccessPoints([])
    setEnteringPassword(false)
  }

  const connect = async (ap: any, password: string): Promise<void> => {
    await connectToNetwork(ap.ssid, password || undefined)
  }

  return (
    <box cssClasses={["setting-nw"]} orientation={Gtk.Orientation.VERTICAL}>

      <box spacing={8}>
        <button onClicked={toggleWifi}>
          <image iconName={icon} />
        </button>

        <label hexpand halign={Gtk.Align.START} label={ssid} />

        <button
          onClicked={() => {
            if (expanded()) {
              collapseAndStopScan()
            } else {
              setExpanded(true)
              scanNetworks()
            }
          }}
        >
          <image iconName={expanded(e => e ? "pan-down-symbolic" : "go-next-symbolic")} />
        </button>
      </box>

      <revealer
        revealChild={expanded(e => e && (network.wifi?.enabled ?? false))}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2} marginTop={4}>
          <For each={accessPoints}>
            {(ap) => (
              <AccessPoint
                ap={ap}
                onConnect={connect}
                onExpandChange={(isExpanded) => setEnteringPassword(isExpanded)}
              />
            )}
          </For>
        </box>
      </revealer>

    </box>
  )
}