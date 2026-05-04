// @ts-ignore
import Bluez from "gi://AstalBluetooth"
// @ts-ignore
import Wp from "gi://AstalWp"
import { createState, createComputed, createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import { bluetoothIcon, preferredDeviceBattery } from "../../../utils/system/bluetooth"

export default function Bluetooth() {
  const bluetooth = Bluez.get_default()
  const wp = Wp.get_default()
  const speaker = wp?.audio?.defaultSpeaker
  const [pinned, setPinned] = createState(false)
  const [hovered, setHovered] = createState(false)

  const icon = createComputed(
    [createBinding(bluetooth, "is_powered"), createBinding(bluetooth, "is_connected")],
    (powered, connected) => bluetoothIcon(powered, connected)
  )

  const batteryLabel = createBinding(bluetooth, "devices")((devices: Bluez.Device[]) =>
    preferredDeviceBattery(devices, speaker?.description ?? "")
  )

  const showBattery = createComputed(
    [pinned, hovered],
    (p, h) => p || h
  )

  const motionController = new Gtk.EventControllerMotion()
  motionController.connect("enter", () => setHovered(true))
  motionController.connect("leave", () => setHovered(false))

  return (
    <button
      cssClasses={["bar-bt"]}
      visible={createBinding(bluetooth, "is_connected")}
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
          revealChild={showBattery}
          transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
          transitionDuration={200}
        >
          <label label={batteryLabel(l => " " + l)} />
        </revealer>
      </box>
    </button>
  )
}