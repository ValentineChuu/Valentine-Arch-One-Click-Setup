import GLib from "gi://GLib"
import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import Hyprland from "../../../utils/system/hyprland"
import Configs from "../../../utils/config";

export default function Clock() {
  const [secondFormat, setSecondFormat] = createState(false)

  const time = createPoll({ h: "", m: "", s: "", p: "" }, 1000, () => {
    const now = GLib.DateTime.new_now_local()
    if (Configs.clock.military_time) {
      return { h: now.format("%H")!, m: now.format("%M")!, s: now.format("%S")!, p: "" }
    }
    return {
      h: now.format("%I")!,
      m: now.format("%M")!,
      s: now.format("%S")!,
      p: now.format("%p")!,
    }
  })

  const baseLabel = time((t) => `${t.h}󰇙${t.m}`)
  const secondLabel = time((t) => `󰇙${t.s}`)
  const amLabel = time((t) => Configs.clock.military_time ? "" : ` ${t.p}`)

  const motionController = new Gtk.EventControllerMotion()
  motionController.connect("enter", () => setSecondFormat(true))
  motionController.connect("leave", () => setSecondFormat(false))

  return (
    <button
      cssClasses={["bar-clock"]}
      onClicked={() => Hyprland.dispatch("togglespecialworkspace", "note")}
      $={(self) => self.add_controller(motionController)}
    >
      <box>
        <label label={baseLabel} />
        <revealer
          revealChild={secondFormat}
          transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
          transitionDuration={200}
        >
          <label label={secondLabel} />
        </revealer>
        <label label={amLabel} />
      </box>
    </button>
  )
}