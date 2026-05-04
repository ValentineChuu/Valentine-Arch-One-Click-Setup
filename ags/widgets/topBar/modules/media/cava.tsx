import { Gtk } from "ags/gtk4";
import { initLayers, drawLayerCava, CavaLayer, CavaConfig } from "../../../../utils/media/cavaStyle";
import Configs from "../../../../utils/config";

const cava = Configs.cava;
const barConfig = cava as CavaConfig;
const mediaConfig = (cava.shared_cava
  ? cava
  : cava.media_cava ?? cava) as CavaConfig;
const barRadius = Number.parseFloat(Configs.css?.windowBorderRadius ?? "0") || 0;

const barLayers = initLayers(barConfig);
const mediaLayers = cava.shared_cava ? barLayers : initLayers(mediaConfig);

function LayerDrawing({
  layer,
  config,
  heightScale = 1,
  barRadius = 0,
}: {
  layer: CavaLayer;
  config: CavaConfig;
  heightScale?: number;
  barRadius?: number;
}) {
  return (
    <Gtk.DrawingArea
      hexpand
      vexpand
      canTarget={false}
      $={(self: Gtk.DrawingArea) => {
        self.set_draw_func((_area, cr, width, height) => {
          const drawHeight = height * heightScale
          const yOffset = height - drawHeight

          if (yOffset > 0) {
            cr.translate(0, yOffset)
          }

          drawLayerCava(cr, config, layer, width, drawHeight, barRadius);
        });

        layer.cava.connect("notify::values", () => {
          self.queue_draw();
        });
      }}
    />
  );
}

/** Cava overlays for the bar media player. */
export function createBarCavaOverlays(): Gtk.Widget[] {
  return barLayers.map((layer) => (
    <LayerDrawing layer={layer} config={barConfig} barRadius={barRadius} />
  ) as Gtk.Widget);
}

/** Cava overlays for the big media player. */
export function createMediaCavaOverlays(): Gtk.Widget[] {
  return mediaLayers.map((layer) => (
    <LayerDrawing layer={layer} config={barConfig} heightScale={0.7} />
  ) as Gtk.Widget);
}