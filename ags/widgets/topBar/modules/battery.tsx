// @ts-ignore
import Battery from "gi://AstalBattery"
import { createState, createComputed, createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import { batteryIconName } from "../../../utils/system/battery"

export default function Power() {
  const battery = Battery.get_default()
  const [pinned, setPinned] = createState(false)
  const [hovered, setHovered] = createState(false)

  const icon = createComputed(
    [createBinding(battery, "percentage"), createBinding(battery, "charging")],
    (percentage, charging) => batteryIconName(percentage, charging)
  )

  const label = createBinding(battery, "percentage")(
    (p) => `${Math.round(p * 100)}%`
  )

  const showLabel = createComputed(
    [pinned, hovered],
    (p, h) => p || h
  )

  const visible = createBinding(battery, "is_present")

  const motionController = new Gtk.EventControllerMotion()
  motionController.connect("enter", () => setHovered(true))
  motionController.connect("leave", () => setHovered(false))

  return (
    <button
      css_classes={["bar-bat"]}
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
