// @ts-ignore
import Notifd from "gi://AstalNotifd"
import Pango from "gi://Pango"
import GLib from "gi://GLib"
import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { addToHistory, urgencyClass } from "../../utils/system/notifications"
import TimerBorder from "./timerBorder"

export default function NotificationRow({ notification }: {
  notification: Notifd.Notification
}) {
  addToHistory(notification)
  const notifd = Notifd.get_default()
  const [hovered, setHovered] = createState(false)
  const [visible, setVisible] = createState(false)
  const DURATION = 10000
  let dismissed = false

  const dismiss = () => {
    if (dismissed) return
    dismissed = true
    setVisible(false)
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      try { notification.dismiss() } catch (_) { }
      return false
    })
  }

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
    setVisible(true)
    return false
  })

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, DURATION, () => {
    if (hovered()) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        if (!hovered()) { dismiss(); return false }
        return true
      })
    } else {
      dismiss()
    }
    return false
  })

  const motionController = new Gtk.EventControllerMotion()
  motionController.connect("enter", () => setHovered(true))
  motionController.connect("leave", () => setHovered(false))

  const click = new Gtk.GestureClick()
  click.button = 0
  click.connect("pressed", (_self: Gtk.GestureClick, _n: number, _x: number, _y: number) => {
    const button = click.get_current_button()
    if (button === 3) dismiss()
    else if (button === 2) notifd.notifications?.forEach((n: any) => { try { n.dismiss() } catch (_) { } })
    else if (notification.actions?.length > 0) {
      notification.invoke(notification.actions[0].id ?? notification.actions[0].action)
    }
  })

  return (
    <revealer
      revealChild={visible}
      transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
      transitionDuration={300}
    >
      <overlay
        $={(self) => {
          self.add_controller(motionController)
          self.add_controller(click)
        }}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["notification", `notification-${urgencyClass(notification.urgency)}`]}
        >
          <box cssClasses={["notification-header"]} spacing={8}>
            <image iconName={notification.appIcon ?? notification.image ?? "dialog-information-symbolic"} pixelSize={20} />
            <label
              hexpand
              halign={Gtk.Align.START}
              cssClasses={["notification-app-name"]}
              label={notification.appName ?? ""}
              ellipsize={Pango.EllipsizeMode.END}
              singleLineMode
            />
          </box>

          <Gtk.Separator />

          <box cssClasses={["notification-content"]} spacing={8}>
            <box orientation={Gtk.Orientation.VERTICAL} hexpand spacing={4}>
              <label
                cssClasses={["notification-summary"]}
                halign={Gtk.Align.START}
                label={notification.summary ?? ""}
                wrap
                wrapMode={Pango.WrapMode.WORD_CHAR}
                ellipsize={Pango.EllipsizeMode.END}
                lines={2}
              />
              {notification.body && (
                <label
                  cssClasses={["notification-body"]}
                  halign={Gtk.Align.START}
                  label={notification.body}
                  wrap
                  wrapMode={Pango.WrapMode.WORD_CHAR}
                  ellipsize={Pango.EllipsizeMode.END}
                  lines={5}
                />
              )}
            </box>
          </box>

          {notification.actions?.length > 0 && (
            <box cssClasses={["notification-actions"]}>
              {notification.actions.map((action: any) => (
                <button
                  hexpand
                  cssClasses={["settings-icon-button"]}
                  onClicked={() => notification.invoke(action.id ?? action.action)}
                >
                  <label hexpand halign={Gtk.Align.CENTER} label={action.label} />
                </button>
              ))}
            </box>
          )}
        </box>

        <TimerBorder $type="overlay" duration={DURATION} hovered={hovered} />

      </overlay>
    </revealer>
  )
}