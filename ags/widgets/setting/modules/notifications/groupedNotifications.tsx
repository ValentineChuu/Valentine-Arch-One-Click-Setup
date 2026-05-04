import Pango from "gi://Pango"
import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { StoredNotif } from "../../../../utils/system/notifications"

export default function GroupedNotifications({ appName, notifications, onDismissAll, onDismiss }: {
  appName: string
  notifications: StoredNotif[]
  onDismissAll: () => void
  onDismiss: (id: number) => void
}) {
  const [expanded, setExpanded] = createState(false)
  const count = notifications.length
  const isGroup = count > 1

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["notification-group"]}>

      <button
        cssClasses={isGroup ? ["notification", "notification-collapsed"] : ["notification"]}
        onClicked={() => { if (isGroup) setExpanded(!expanded()) }}
      >
        <box spacing={8}>
          <image iconName={notifications[0].appIcon} pixelSize={16} />
          <label
            hexpand
            halign={Gtk.Align.START}
            cssClasses={["notification-app-name"]}
            label={isGroup ? `${appName} (${count})` : appName}
            ellipsize={Pango.EllipsizeMode.END}
            singleLineMode
          />
          {isGroup && (
            <image iconName={expanded(e => e ? "pan-up-symbolic" : "pan-down-symbolic")} />
          )}
          <button
            cssClasses={["settings-icon-button"]}
            $={(self) => {
              const click = new Gtk.GestureClick()
              click.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
              click.connect("pressed", () => {
                onDismissAll()
                click.set_state(Gtk.EventSequenceState.CLAIMED)
              })
              self.add_controller(click)
            }}
          >
            <image iconName="window-close-symbolic" pixelSize={12} />
          </button>
        </box>
      </button>

      {!isGroup && (
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["notification", "notification-stored"]}
          spacing={4}
          marginStart={8}
        >
          <label
            hexpand
            halign={Gtk.Align.START}
            cssClasses={["notification-summary"]}
            label={notifications[0].summary}
            wrap
            wrapMode={Pango.WrapMode.WORD_CHAR}
            ellipsize={Pango.EllipsizeMode.END}
            lines={2}
          />
          {notifications[0].body && (
            <label
              halign={Gtk.Align.START}
              cssClasses={["notification-body"]}
              label={notifications[0].body}
              wrap
              wrapMode={Pango.WrapMode.WORD_CHAR}
              ellipsize={Pango.EllipsizeMode.END}
              lines={3}
            />
          )}
        </box>
      )}

      {isGroup && (
        <>
          <box
            visible={expanded(e => !e)}
            cssClasses={["notification-collapsed-preview"]}
            marginStart={8}
          >
            <label
              hexpand
              halign={Gtk.Align.START}
              cssClasses={["notification-summary"]}
              label={notifications[0].summary}
              ellipsize={Pango.EllipsizeMode.END}
              singleLineMode
            />
          </box>

          <revealer
            revealChild={expanded}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2} marginStart={8}>
              {notifications.map(n => (
                <box
                  orientation={Gtk.Orientation.VERTICAL}
                  cssClasses={["notification", "notification-stored"]}
                  spacing={4}
                >
                  <box spacing={8}>
                    <label
                      hexpand
                      halign={Gtk.Align.START}
                      cssClasses={["notification-summary"]}
                      label={n.summary}
                      wrap
                      wrapMode={Pango.WrapMode.WORD_CHAR}
                      ellipsize={Pango.EllipsizeMode.END}
                      lines={2}
                    />
                    <button
                      cssClasses={["settings-icon-button"]}
                      onClicked={() => onDismiss(n.id)}
                    >
                      <image iconName="window-close-symbolic" pixelSize={12} />
                    </button>
                  </box>
                  {n.body && (
                    <label
                      halign={Gtk.Align.START}
                      cssClasses={["notification-body"]}
                      label={n.body}
                      wrap
                      wrapMode={Pango.WrapMode.WORD_CHAR}
                      ellipsize={Pango.EllipsizeMode.END}
                      lines={3}
                    />
                  )}
                </box>
              ))}
            </box>
          </revealer>
        </>
      )}

    </box>
  )
}