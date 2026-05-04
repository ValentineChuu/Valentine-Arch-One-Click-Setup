import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { strengthIcon } from "../../../../utils/system/wifi"

export default function AccessPoint({
  ap,
  onConnect,
  onExpandChange,
}: {
  ap: any
  onConnect: (ap: any, password: string) => Promise<void>
  onExpandChange?: (expanded: boolean) => void
}) {
  const [expanded, setExpanded] = createState(false)
  const [password, setPassword] = createState("")
  const [connecting, setConnecting] = createState(false)
  const [error, setError] = createState("")
  const [showPassword, setShowPassword] = createState(false)

  const expand = (value: boolean) => {
    setExpanded(value)
    onExpandChange?.(value)
  }

  const tryConnect = async (pw: string) => {
    setConnecting(true)
    setError("")
    try {
      await onConnect(ap, pw)
      expand(false)
    } catch (e: any) {
      if (e.toString().includes("Secrets were required") || e.toString().includes("password")) {
        expand(true)
        setError("Password required")
      } else {
        setError("Failed to connect")
      }
    }
    setConnecting(false)
  }

  return (
    <box cssClasses={["setting-nw"]} orientation={Gtk.Orientation.VERTICAL}>
      <button onClicked={() => expand(!expanded())}>
        <box spacing={8}>
          <label hexpand halign={Gtk.Align.START} label={ap.ssid ?? "Unknown"} />
          <image iconName={strengthIcon(ap.strength)} halign={Gtk.Align.END} />
        </box>
      </button>
      <revealer
        revealChild={expanded}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} marginStart={8} marginBottom={4}>
          <box spacing={4}>
            <button onClicked={() => setShowPassword(!showPassword())}>
              <image iconName={showPassword(s => s ? "view-reveal-symbolic" : "view-conceal-symbolic")} />
            </button>
            <entry
              hexpand
              placeholderText="Password"
              visibility={showPassword}
              inputPurpose={Gtk.InputPurpose.PASSWORD}
              onNotifyText={(self) => setPassword(self.text)}
              onActivate={() => tryConnect(password())}
              cssClasses={["setting-nw-entry"]}
              $={(self) => {
                const updateSpacing = () => {
                  if (self.text.length > 0 && !showPassword()) {
                    self.add_css_class("setting-nw-entry-concealed")
                  } else {
                    self.remove_css_class("setting-nw-entry-concealed")
                  }
                }

                self.connect("notify::text", updateSpacing)
                self.connect("notify::visibility", updateSpacing)

                self.connect("notify::mapped", () => {
                  if (self.get_mapped() && expanded()) {
                    self.grab_focus()
                  }
                })
              }}
            />
            <button onClicked={() => tryConnect(password())}>
              <image iconName={connecting(c => c ? "process-working-symbolic" : "go-next-symbolic")} />
            </button>
          </box>
          <label
            visible={error(e => e !== "")}
            label={error}
            cssClasses={["setting-network-error"]}
            halign={Gtk.Align.START}
          />
        </box>
      </revealer>
    </box>
  )
}