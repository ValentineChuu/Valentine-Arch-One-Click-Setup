import app from "ags/gtk4/app"
import { Gtk, Astal } from "ags/gtk4"
import Clock from "./modules/clock"
import Workspaces from "./modules/workspace"
import Media from "./modules/media"
import Hardware from "./modules/hardware"
import Bluetooth from "./modules/bluetooth"
import Network from "./modules/network"
import Power from "./modules/battery"
import SettingsButton from "./modules/settingsButton"

export default function TopBar() {
  // @ts-ignore
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      anchor={TOP | LEFT | RIGHT}
      application={app}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      marginLeft={6}
      marginRight={6}
      marginTop={6}
      keymode={Astal.Keymode.ON_DEMAND}
    >
      <centerbox cssClasses={["bar"]}>
        <box cssClasses={["bar-left"]} $type="start" spacing={8}>
          <Workspaces />
          <Clock />
        </box>
        <box cssClasses={["bar-middle"]} $type="center">
          <Media />
        </box>
        <box cssClasses={["bar-right"]} $type="end" spacing={4}>
          <Hardware />
          <Gtk.Separator
            cssClasses={["bar-separator"]}
            orientation={Gtk.Orientation.VERTICAL}
            marginTop={4}
            marginBottom={4}
          />
          <Bluetooth />
          <Network />
          <Power />
          <Gtk.Separator
            cssClasses={["bar-separator"]}
            orientation={Gtk.Orientation.VERTICAL}
            marginTop={4}
            marginBottom={4}
          />
          <SettingsButton />
        </box>
      </centerbox>
    </window>
  )
}
