import GLib from "gi://GLib"
import { Gtk } from "ags/gtk4"
import { register } from "ags/gobject"

@register({ GTypeName: "TimerBorderWidget" })
class TimerBorderWidget extends Gtk.DrawingArea {
  static {
    Gtk.Widget.set_css_name.call(this, "timer-border")
  }
}

/**
 * Animated border that traces the notification perimeter over its lifetime.
 * Draws a shrinking path (bottom → left → top → right) using cairo,
 * pausing while the notification is hovered.
 */
export default function TimerBorder({ duration, hovered }: {
  duration: number
  hovered: any
}) {
  let progress = 1.0
  let drawingArea: TimerBorderWidget | null = null

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
    if (!drawingArea) return true
    if (hovered()) return true
    progress -= 16 / duration
    if (progress <= 0) {
      drawingArea.queue_draw()
      return false
    }
    drawingArea.queue_draw()
    return true
  })

  return (
    <TimerBorderWidget
      hexpand
      vexpand
      canTarget={false}
      $={(self) => {
        drawingArea = self
        self.set_draw_func((_area: any, cr: any, width: number, height: number) => {
          if (progress <= 0) return

          const color = self.get_style_context().get_color()
          cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha * progress)

          const lineWidth = 4
          cr.setLineWidth(lineWidth)

          const totalPerimeter = 2 * (width + height)
          const drawn = totalPerimeter * progress

          cr.moveTo(width, height)
          let remaining = drawn

          const bottom = Math.min(remaining, width)
          cr.lineTo(width - bottom, height)
          remaining -= bottom
          if (remaining <= 0) { cr.stroke(); return }

          const left = Math.min(remaining, height)
          cr.lineTo(0, height - left)
          remaining -= left
          if (remaining <= 0) { cr.stroke(); return }

          const top = Math.min(remaining, width)
          cr.lineTo(top, 0)
          remaining -= top
          if (remaining <= 0) { cr.stroke(); return }

          const right = Math.min(remaining, height)
          cr.lineTo(width, right)

          cr.stroke()
        })
      }}
    />
  )
}