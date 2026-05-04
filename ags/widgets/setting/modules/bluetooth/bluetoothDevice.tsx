// @ts-ignore
import Bluez from "gi://AstalBluetooth"
import { createState, createComputed, createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import { bluetoothIcon, connectDevice, disconnectDevice, removeDevice, pairDevice } from "../../../../utils/system/bluetooth"

export function PairedDevice({ device, onUnpair }: { device: Bluez.Device, onUnpair: () => void }) {
  const [connecting, setConnecting] = createState(false)
  const [menuExpanded, setMenuExpanded] = createState(false)
  const [unpairing, setUnpairing] = createState(false)

  const icon = createComputed(
    [connecting, createBinding(device, "connected")],
    (c, connected) => {
      if (c) return "process-working-symbolic"
      return bluetoothIcon(true, connected)
    }
  )

  const status = createBinding(device, "connected")((connected) =>
    connected ? "Connected" : "Disconnected"
  )

  const battery = createBinding(device, "battery_percentage")((p) =>
    p > 0 ? ` — ${Math.round(p * 100)}%` : ""
  )

  const label = createBinding(device, "name")((n) => n ?? "Unknown")

  const toggle = async () => {
    setConnecting(true)
    try {
      if (device.connected) {
        await disconnectDevice(device.address)
      } else {
        await connectDevice(device.address)
      }
    } catch (e) {
      console.error("Failed to toggle device:", e)
    }
    setConnecting(false)
  }

  const unpair = async () => {
    setUnpairing(true)
    try {
      await removeDevice(device.address)
      onUnpair()
    } catch (e) {
      console.error("Failed to unpair device:", e)
    }
    setUnpairing(false)
    setMenuExpanded(false)
  }

  const rightClick = new Gtk.GestureClick()
  rightClick.button = 3
  rightClick.connect("pressed", () => setMenuExpanded(!menuExpanded()))

  return (
    <box cssClasses={["setting-bt-device"]} orientation={Gtk.Orientation.VERTICAL}>

      <button
        onClicked={toggle}
        $={(self) => self.add_controller(rightClick)}
      >
        <box spacing={8}>
          <image iconName={icon} />
          <label hexpand halign={Gtk.Align.START} label={label} />
          <label cssClasses={["perf-stat-label"]} halign={Gtk.Align.END} label={status} />
          <label halign={Gtk.Align.END} label={battery} />
        </box>
      </button>

      <revealer
        hexpand
        revealChild={menuExpanded}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box>
          <button
            halign={Gtk.Align.FILL}
            hexpand
            cssClasses={["settings-icon-button"]}
            onClicked={unpair}
          >
            <box spacing={4} halign={Gtk.Align.CENTER}>
              <image iconName={unpairing(u => u ? "process-working-symbolic" : "edit-delete-symbolic")} />
              <label label="Unpair and forget" />
            </box>
          </button>
        </box>
      </revealer>

    </box>
  )
}

export function DiscoveredDevice({ device, onPair }: { device: { name: string, address: string }, onPair: () => void }) {
  const [pairing, setPairing] = createState(false)
  const [error, setError] = createState("")

  const pair = async () => {
    setPairing(true)
    setError("")
    try {
      await pairDevice(device.address)
      setPairing(false)
      onPair()
    } catch (e: any) {
      console.error("Failed to pair:", e)
      setError("Failed to pair")
      setPairing(false)
    }
  }

  return (
    <box cssClasses={["setting-bt-discovered"]} orientation={Gtk.Orientation.VERTICAL}>
      <button onClicked={pair}>
        <box spacing={8}>
          <image iconName={pairing(p => p ? "process-working-symbolic" : "bluetooth-symbolic")} />
          <label hexpand halign={Gtk.Align.START} label={device.name} />
          <label halign={Gtk.Align.END} cssClasses={["perf-stat-label"]} label={pairing(p => p ? "Pairing..." : "Pair")} />
        </box>
      </button>
      <label
        visible={error(e => e !== "")}
        label={error}
        cssClasses={["setting-network-error"]}
        halign={Gtk.Align.START}
        marginStart={8}
      />
    </box>
  )
}