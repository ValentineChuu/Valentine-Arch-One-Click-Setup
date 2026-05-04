// @ts-ignore
import Notifd from "gi://AstalNotifd"
import { createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import { StoredNotif, getNotificationHistory, removeFromHistory, clearHistory } from "../../../utils/system/notifications"
import GroupedNotifications from "./notifications/groupedNotifications"

export default function NotificationCenter() {
  const notifd = Notifd.get_default()
  const history = getNotificationHistory()
  const dnd = createBinding(notifd, "dont_disturb")

  const grouped = history((notifs) => {
    const groups = new Map<string, StoredNotif[]>()
    for (const n of notifs) {
      const key = n.appName || "Unknown"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(n)
    }
    return Array.from(groups.entries()).map(([appName, notifications]) => ({
      appName,
      notifications,
    }))
  })

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["setting-noti"]} spacing={4}>

      <box spacing={8}>
        <label hexpand halign={Gtk.Align.START} label="Notifications" />

        <button
          tooltipText={dnd(d => d ? "Do Not Disturb: On" : "Do Not Disturb: Off")}
          onClicked={() => { notifd.dont_disturb = !notifd.dont_disturb }}
        >
          <image iconName={dnd(d => d ? "notifications-disabled-symbolic" : "preferences-system-notifications-symbolic")} />
        </button>

        <button
          visible={history(h => h.length > 0)}
          onClicked={clearHistory}
        >
          <image iconName="edit-clear-all-symbolic" />
        </button>
      </box>

      <label
        visible={history(h => h.length === 0)}
        label="No notifications"
        halign={Gtk.Align.CENTER}
      />

      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        <For each={grouped}>
          {(group) => (
            <GroupedNotifications
              appName={group.appName}
              notifications={group.notifications}
              onDismissAll={() => group.notifications.forEach(n => removeFromHistory(n.id))}
              onDismiss={(id) => removeFromHistory(id)}
            />
          )}
        </For>
      </box>

    </box>
  )
}