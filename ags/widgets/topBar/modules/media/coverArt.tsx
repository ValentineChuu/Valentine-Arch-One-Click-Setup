// @ts-ignore
import Mpris from "gi://AstalMpris";
import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import Gdk from "gi://Gdk";
import GdkPixbuf from "gi://GdkPixbuf";
import Cairo from "gi://cairo";
import { blurImage, BlurOptions } from "../../../../utils/media/blur";
import { cacheArt } from "../../../../utils/media/artCache";
import { onTrackChange } from "../../../../utils/media/trackChange";
import Configs from "../../../../utils/config";

const COVER_HEIGHT = 34;
const BIG_SCALE = 0.7;
const BLUR_OPTS = Configs.blur as BlurOptions;

interface CoverArtProps {
  player: Mpris.Player;
}

export default function CoverArt({ player }: CoverArtProps) {
  let pixbuf: GdkPixbuf.Pixbuf | null = null;
  let lastPath = "";
  let forceFallback = false;
  let fallbackImage: Gtk.Image | null = null;

  function updateFallback() {
    if (!fallbackImage) return;
    if (!forceFallback && pixbuf) {
      fallbackImage.hide();
      return;
    }
    fallbackImage.show();
    const icon =
      player.playbackStatus === 0
        ? "media-playback-pause-symbolic"
        : "media-playback-start-symbolic";
    fallbackImage.set_from_icon_name(icon);
  }

  return (
    <button
      cssClasses={["emptyButton"]}
      onClicked={() => player.play_pause()}
    >
      <box>
        <drawingarea
          heightRequest={COVER_HEIGHT}
          $={(area: Gtk.DrawingArea) => {
            function loadArt(path: string) {
              if (path === lastPath) return;
              lastPath = path;

              try {
                const loaded = GdkPixbuf.Pixbuf.new_from_file(path);
                const w = Math.round(
                  (loaded.get_width() / loaded.get_height()) * COVER_HEIGHT
                );
                pixbuf = loaded.scale_simple(w, COVER_HEIGHT, GdkPixbuf.InterpType.BILINEAR);
                area.set_content_width(w);
                area.show();
                forceFallback = false;
                cancelClear();
                area.queue_draw();
                updateFallback();
                cacheArt(player.title, path);
              } catch (e) {
                print("cover-art error:", e);
              }
            }

            const cancelClear = onTrackChange(
              player,
              () => {
                lastPath = "";
                forceFallback = true;
                area.hide();
                updateFallback();
              },
              (cached) => loadArt(cached),
            );

            const update = () => {
              const path = player.coverArt;
              if (!path) return;
              loadArt(path);
            };

            update();
            player.connect("notify::cover-art", update);

            area.set_draw_func((_, cr, width, height) => {
              if (!pixbuf) return;

              Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0);
              cr.paint();

              const gradient = new (Cairo as any).LinearGradient(0, 0, width, 0);
              gradient.addColorStopRGBA(0.0, 0, 0, 0, 1);
              gradient.addColorStopRGBA(0.2, 0, 0, 0, 0);
              gradient.addColorStopRGBA(0.8, 0, 0, 0, 0);
              gradient.addColorStopRGBA(1.0, 0, 0, 0, 1);

              cr.setOperator(Cairo.Operator.DEST_OUT);
              cr.setSource(gradient);
              cr.rectangle(0, 0, width, height);
              cr.fill();
              cr.setOperator(Cairo.Operator.OVER);
            });
          }}
        />

        <image
          iconName="media-playback-pause-symbolic"
          $={(self: Gtk.Image) => {
            fallbackImage = self;
            updateFallback();
            player.connect("notify::playback-status", updateFallback);
            player.connect("notify::cover-art", updateFallback);
          }}
        />
      </box>
    </button>
  );
}

export function BlurredBackground({ player }: CoverArtProps) {
  let blurred: GdkPixbuf.Pixbuf | null = null;
  let lastPath = "";

  return (
    <drawingarea
      hexpand
      vexpand
      canTarget={false}
      $={(area: Gtk.DrawingArea) => {
        function loadArt(path: string) {
          if (path === lastPath) return;
          lastPath = path;

          try {
            const orig = GdkPixbuf.Pixbuf.new_from_file(path);
            const origW = orig.get_width();
            const origH = orig.get_height();
            const size = Math.round(Math.min(origW, origH) * BIG_SCALE);

            area.set_content_height(size);

            const blurredPath = blurImage(path, BLUR_OPTS);
            if (!blurredPath) return;

            blurred = GdkPixbuf.Pixbuf.new_from_file(blurredPath);
            cancelClear();
            area.queue_draw();
            cacheArt(player.title, path);
          } catch (e) {
            print("blur error: " + e);
          }
        }

        const cancelClear = onTrackChange(
          player,
          () => {
            lastPath = "";
            blurred = null;
            area.queue_draw();
          },
          (cached) => loadArt(cached),
        );

        const update = () => {
          const path = player.coverArt;
          if (!path) return;
          loadArt(path);
        };

        update();
        player.connect("notify::cover-art", update);

        area.set_draw_func((_area, cr, width, height) => {
          if (!blurred) return;

          const srcW = blurred.get_width();
          const srcH = blurred.get_height();
          const scale = Math.max(width / srcW, height / srcH);

          const offX = (width - srcW * scale) / 2;
          const offY = (height - srcH * scale) / 2;

          cr.save();
          cr.rectangle(0, 0, width, height);
          cr.clip();
          cr.scale(scale, scale);
          Gdk.cairo_set_source_pixbuf(cr, blurred, offX / scale, offY / scale);
          cr.paintWithAlpha(BLUR_OPTS.opacity ?? 1.0);
          cr.restore();
        });
      }}
    />
  );
}

export function SquareCover({ player }: CoverArtProps) {
  let pixbuf: GdkPixbuf.Pixbuf | null = null;
  let lastPath = "";
  const SIZE = 132;
  let fallbackRef: Gtk.Widget | null = null;

  function updateFallback() {
    if (!fallbackRef) return;
    fallbackRef.visible = !pixbuf;
  }

  const fallbackIcon = (
    <image
      iconName="audio-x-generic-symbolic"
      pixelSize={SIZE / 2}
      opacity={0.5}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      widthRequest={SIZE}
      heightRequest={SIZE}
      $={(self: Gtk.Widget) => {
        fallbackRef = self;
        updateFallback();
      }}
    />
  ) as Gtk.Widget;

  const coverDrawing = (
    <drawingarea
      widthRequest={SIZE}
      heightRequest={SIZE}
      $={(area: Gtk.DrawingArea) => {
        function loadArt(path: string) {
          if (path === lastPath) return;
          lastPath = path;

          try {
            const orig = GdkPixbuf.Pixbuf.new_from_file(path);
            const origW = orig.get_width();
            const origH = orig.get_height();
            const minDim = Math.min(origW, origH);
            const size = Math.round(minDim * BIG_SCALE);

            const cropX = Math.round((origW - minDim) / 2);
            const cropY = Math.round((origH - minDim) / 2);
            const cropped = orig.new_subpixbuf(cropX, cropY, minDim, minDim);

            pixbuf = cropped.scale_simple(size, size, GdkPixbuf.InterpType.BILINEAR);

            area.set_content_width(size);
            area.set_content_height(size);
            cancelClear();
            area.queue_draw();
            updateFallback();
            cacheArt(player.title, path);
          } catch (e) {
            print("square cover error: " + e);
          }
        }

        const cancelClear = onTrackChange(
          player,
          () => {
            lastPath = "";
            pixbuf = null;
            area.queue_draw();
            updateFallback();
          },
          (cached) => loadArt(cached),
        );

        const update = () => {
          const path = player.coverArt;
          if (!path) {
            if (!pixbuf) updateFallback();
            return;
          }
          loadArt(path);
        };

        update();
        player.connect("notify::cover-art", update);

        area.set_draw_func((_area, cr) => {
          if (!pixbuf) return;
          Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0);
          cr.paint();
        });
      }}
    />
  ) as Gtk.Widget;

  return (
    <button
      cssClasses={["emptyButton"]}
      onClicked={() => app.toggle_window("big-media")}
    >
      <Gtk.Overlay
        child={coverDrawing}
        $={(overlay: Gtk.Overlay) => {
          overlay.add_overlay(fallbackIcon);
        }}
      />
    </button>
  );
}