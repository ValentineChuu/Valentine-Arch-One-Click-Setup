import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import Power from "./modules/battery"
import Network from "./modules/network"
import { stopWifiScan } from "../../utils/system/wifi"
import Bluetooth from "./modules/bluetooth"
import { stopBluetooth } from "../../utils/system/bluetooth"
import VolumeSliders from "./modules/volume"
import BrightnessSlider from "./modules/brightness"
import NotificationCenter from "./modules/notifications"

export default function Settings() {
  // @ts-ignore
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor

  const close = () => {
    app.toggle_window("settings")
  }

  return (
    <window
      name={"settings"}
      visible={false}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      application={app}
      defaultWidth={-1}
      exclusivity={Astal.Exclusivity.IGNORE}
      // @ts-ignore
      keymode={Astal.Keymode.PASSIVE}
      $={(self) => {
        self.set_default_size(1, 1)
        self.connect("notify::visible", () => {
          if (self.visible) {
            self.keymode = Astal.Keymode.ON_DEMAND
          } else {
            // @ts-ignore
            self.keymode = Astal.Keymode.PASSIVE
            stopWifiScan()
            stopBluetooth()
          }
        })

        // Click outside to close
        const click = new Gtk.GestureClick()
        click.connect("released", () => close())
        self.add_controller(click)
      }}
    >
      <box
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        marginTop={46}
        marginEnd={6}
      >
        <box
          cssClasses={["setting"]}
          widthRequest={300}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={4}
          $={(self) => {
            const click = new Gtk.GestureClick()
            click.set_button(0) // catch all mouse buttons
            click.connect("released", () => {
              click.set_state(Gtk.EventSequenceState.CLAIMED)
            })
            self.add_controller(click)
          }}
        >
          <Power />
          <Network />
          <Bluetooth />
          <VolumeSliders />
          <BrightnessSlider />
          <NotificationCenter />
        </box>
      </box>
    </window>
  )
}