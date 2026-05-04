import GLib from "gi://GLib"
import { Gtk } from "ags/gtk4"

/**
 * Draggable progress bar built from a track + fill box pair.
 * Supports click-to-seek and drag-to-adjust.
 * Includes a small circle knob at the current position for easier dragging.
 */
export default function CustomBar({
  value,
  onChangeValue,
}: {
  value: any
  onChangeValue: (v: number) => void
}) {
  return (
    <overlay
      hexpand
      heightRequest={20}
      valign={Gtk.Align.CENTER}
      $={(overlay) => {
        const track = new Gtk.Box()
        track.cssClasses = ["perf-bar-track"]
        track.hexpand = true
        track.heightRequest = 4
        track.valign = Gtk.Align.CENTER
        track.vexpand = false

        const fill = new Gtk.Box()
        fill.cssClasses = ["perf-bar-fill"]
        fill.heightRequest = 4
        track.append(fill)

        overlay.child = track

        const knob = new Gtk.Box()
        knob.cssClasses = ["perf-bar-knob"]
        knob.widthRequest = 4
        knob.heightRequest = 4
        knob.valign = Gtk.Align.CENTER
        knob.halign = Gtk.Align.START
        overlay.add_overlay(knob)

        const update = () => {
          const pct = Math.min(1, Math.max(0, isNaN(value()) ? 0 : value()))
          const trackWidth = track.get_allocated_width()
          if (trackWidth > 0) {
            fill.widthRequest = Math.round(pct * trackWidth)
            const knobWidth = knob.get_allocated_width()
            knob.marginStart = Math.max(0, Math.round(pct * trackWidth - knobWidth / 2))
          }

        }

        value.subscribe(() => update())
        track.connect("notify::width", () => update())

        let initialized = false
        overlay.connect("map", () => {
          if (!initialized) {
            initialized = true
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
              update()
              return false
            })
          }
        })

        const click = new Gtk.GestureClick()
        click.connect("pressed", (_self, _n, x) => {
          const w = track.get_allocated_width()
          if (w > 0) onChangeValue(Math.min(1, Math.max(0, x / w)))
        })
        overlay.add_controller(click)

        const drag = new Gtk.GestureDrag()
        drag.connect("drag-update", (_self, x) => {
          const startX = drag.get_start_point()[1]
          const w = track.get_allocated_width()
          if (w > 0) onChangeValue(Math.min(1, Math.max(0, (startX + x) / w)))
        })
        overlay.add_controller(drag)
      }}
    />
  )
}