import { Gtk } from "ags/gtk4";
import GLib from "gi://GLib";
import PangoCairo from "gi://PangoCairo";

const SCROLL_SPEED = 0.5;
const DELAY_FRAMES = 90;
const PAUSE_FRAMES = 60;

interface ScrollingTextProps {
  getText: () => string;
  subscribe: (cb: () => void) => void;
  align: "left" | "center";
  Widget: typeof Gtk.DrawingArea;
}

export default function ScrollingText({
  getText,
  subscribe,
  align,
  Widget,
}: ScrollingTextProps) {
  let currentOffset = 0;
  let lastText = getText();
  let area: Gtk.DrawingArea | null = null;

  let delayCount = 0;
  let pauseCount = 0;
  let phase: "waiting" | "scrolling" | "paused" = "waiting";

  subscribe(() => {
    const newText = getText();
    if (newText !== lastText) {
      lastText = newText;
      currentOffset = 0;
      phase = "waiting";
      delayCount = 0;
    }
  });

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
    if (area) area.queue_draw();
    return GLib.SOURCE_CONTINUE;
  });

  return (
    <Widget
      canTarget={false}
      hexpand
      $={(self: Gtk.DrawingArea) => {
        area = self;
        self.set_draw_func((_a: any, cr: any, width: number, height: number) => {
          const text = getText();
          if (!text) return;

          const layout = self.create_pango_layout(text);
          const [, extents] = layout.get_pixel_extents();
          if (!extents) return;

          const textWidth = extents.width;
          const textHeight = extents.height;
          self.set_content_height(textHeight);
          let xPos = 0;

          if (textWidth <= width) {
            if (align === "center") {
              xPos = (width - textWidth) / 2;
            }
          } else {
            if (phase === "waiting") {
              delayCount++;
              xPos = 0;
              if (delayCount >= DELAY_FRAMES) {
                phase = "scrolling";
                delayCount = 0;
                currentOffset = 0;
              }
            } else if (phase === "scrolling") {
              currentOffset += SCROLL_SPEED;
              const maxScroll = textWidth - width;
              if (currentOffset >= maxScroll) {
                currentOffset = maxScroll;
                phase = "paused";
                pauseCount = 0;
              }
              xPos = -currentOffset;
            } else if (phase === "paused") {
              pauseCount++;
              xPos = -currentOffset;
              if (pauseCount >= PAUSE_FRAMES) {
                currentOffset = 0;
                phase = "waiting";
                delayCount = 0;
              }
            }
          }

          cr.save();
          cr.rectangle(0, 0, width, height);
          cr.clip();

          const color = self.get_style_context().get_color();
          cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha);

          cr.moveTo(xPos - extents.x, -extents.y);
          PangoCairo.show_layout(cr, layout);
          cr.restore();
        });
      }}
    />
  );
}