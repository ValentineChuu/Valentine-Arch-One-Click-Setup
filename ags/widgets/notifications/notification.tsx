// @ts-ignore
import Notifd from "gi://AstalNotifd"
import { createBinding, For } from "ags"
import { Astal, Gtk } from "ags/gtk4"
import app from "ags/gtk4/app"
import NotificationRow from "./notificationRow"

export default function Notifications() {
  const notifd = Notifd.get_default()
  const { BOTTOM, RIGHT } = Astal.WindowAnchor
  const notifications = createBinding(notifd, "notifications")
  const dnd = createBinding(notifd, "dont_disturb")

  return (
    <window
      name="notifications"
      application={app}
      layer={Astal.Layer.OVERLAY}
      anchor={BOTTOM | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      // @ts-ignore
      keymode={Astal.Keymode.PASSIVE}
      marginBottom={36}
      marginRight={36}
      visible={notifications(n => n.length > 0 && !dnd())}
      $={(self) => self.set_default_size(1, 1)}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={300}>
        <For each={notifications(n => [...n].sort((a, b) => a.id - b.id))}>
          {(n) => <NotificationRow notification={n} />}
        </For>
      </box>
    </window>
  )
}