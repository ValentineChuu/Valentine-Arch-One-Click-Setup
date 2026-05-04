// @ts-ignore
import Battery from "gi://AstalBattery"
import { createBinding, createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import { batteryIconName } from "../../../utils/system/battery"

export default function Power() {
  const battery = Battery.get_default()

  const icon = createComputed(
    [createBinding(battery, "percentage"), createBinding(battery, "charging")],
    (percentage, charging) => batteryIconName(percentage, charging)
  )

  const label = createBinding(battery, "percentage")(
    (p) => `${Math.round(p * 100)}%`
  )

  return (
    <box
      cssClasses={["setting-battery"]}
      visible={createBinding(battery, "is_present")}
      spacing={8}
    >
      <image iconName={icon} />
      <overlay hexpand>
        <slider
          hexpand
          valign={Gtk.Align.CENTER}
          value={createBinding(battery, "percentage")}
          onChangeValue={() => { }}
        />
        <label
          $type="overlay"
          canTarget={false}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
          cssClasses={["slider-value"]}
          label={label}
        />
      </overlay>
    </box>
  )
}