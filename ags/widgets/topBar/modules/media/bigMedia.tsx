// @ts-ignore
import Mpris from "gi://AstalMpris";
import app from "ags/gtk4/app";
import { createRoot } from "ags";
import { register } from "ags/gobject";
import { Gtk, Astal } from "ags/gtk4";
import GdkPixbuf from "gi://GdkPixbuf";
import ScrollingText from "../../../../utils/widget/scrollingText";
import { mpris, getSelectedPlayer, onSelectedChanged } from "../../../../utils/media/mpris";
import { createMediaCavaOverlays } from "./cava";
import { BlurredBackground, SquareCover } from "./coverArt";
import { ProgressBar, ProgressLabel } from "./trackInfo";
import MediaSelector, { toggleSelector, closeSelector, clearChildren } from "./mediaSelector"

const SCALE = 0.7;

@register({ GTypeName: "ScrollingTitleWidget" })
class ScrollingTitleWidget extends Gtk.DrawingArea {
  static { Gtk.Widget.set_css_name.call(this, "big-media-title") }
}

@register({ GTypeName: "ScrollingArtistWidget" })
class ScrollingArtistWidget extends Gtk.DrawingArea {
  static { Gtk.Widget.set_css_name.call(this, "big-media-artist") }
}

function buildPlayerView(player: Mpris.Player): Gtk.Widget {
  const bg = (<BlurredBackground player={player} />) as Gtk.Widget;
  const playerCavaLayers = createMediaCavaOverlays();

  const content = (
    <box hexpand vexpand>
      <box
        $={(self: Gtk.Box) => {
          const update = () => {
            const path = player.coverArt;
            if (!path) {
              self.widthRequest = 132;
              self.heightRequest = 132;
            };
            try {
              const orig = GdkPixbuf.Pixbuf.new_from_file(path);
              const origW = orig.get_width();
              const origH = orig.get_height();
              const size = Math.round(Math.min(origW, origH) * SCALE);
              self.widthRequest = size;
              self.heightRequest = size;
            } catch (e) { }
          };
          update();
          player.connect("notify::cover-art", update);
        }}
      />

      {/* Controls */}
      <box orientation={Gtk.Orientation.VERTICAL} vexpand>
        <box
          cssClasses={["big-media-controls"]}
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.START}
          hexpand
          marginStart={16}
          marginEnd={16}
          marginTop={8}
        >
          <box>
            <ScrollingText
              getText={() => player.title ?? ""}
              subscribe={(fn) => player.connect("notify::title", fn)}
              align="left"
              Widget={ScrollingTitleWidget}
            />
          </box>
          <box>
            <ScrollingText
              getText={() => player.artist ?? ""}
              subscribe={(fn) => player.connect("notify::artist", fn)}
              align="center"
              Widget={ScrollingArtistWidget}
            />
          </box>
        </box>

        <box
          cssClasses={["big-media-controls"]}
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.END}
          hexpand
          marginStart={16}
          marginEnd={16}
          marginTop={8}
        >
          <box cssClasses={["big-media-control"]} spacing={48} halign={Gtk.Align.CENTER}>
            <button
              $type="start"
              cssClasses={["emptyButton"]}
              iconName="media-skip-backward-symbolic"
              onClicked={() => player.previous()}
            />
            <button
              $type="center"
              cssClasses={["emptyButton"]}
              iconName="media-playback-pause-symbolic"
              $={(self: Gtk.Button) => {
                const update = () => {
                  const icon =
                    player.playbackStatus === 0
                      ? "media-playback-pause-symbolic"
                      : "media-playback-start-symbolic";
                  self.set_icon_name(icon);
                };
                update();
                player.connect("notify::playback-status", update);
              }}
              onClicked={() => player.play_pause()}
            />
            <button
              $type="end"
              cssClasses={["emptyButton"]}
              iconName="media-skip-forward-symbolic"
              onClicked={() => player.next()}
            />
          </box>
          <box cssClasses={["big-media-progress-label"]}>
            <ProgressLabel player={player} />
          </box>
          <box canTarget={false}>
            <ProgressBar player={player} />
          </box>
        </box>
      </box>
    </box>
  ) as Gtk.Widget;

  const mediaSelectButton = (
    <button
      cssClasses={["emptyButton"]}
      iconName={"view-sort-descending-rtl-symbolic"}
      halign={Gtk.Align.END}
      valign={Gtk.Align.START}
      marginTop={8}
      marginEnd={16}
      onClicked={() => toggleSelector()}
      $={(self: Gtk.Button) => {
        const update = () => {
          self.visible = mpris.get_players().length > 1;
        };
        update();
        mpris.connect("notify::players", update);
      }}
    />
  ) as Gtk.Widget;

  const mediaSelect = (
    <box
      cssClasses={["media-select"]}
      valign={Gtk.Align.START}
      marginTop={32}
      marginBottom={8}
      marginStart={8}
      marginEnd={8}
    >
      <MediaSelector />
    </box>
  ) as Gtk.Widget;

  const cover = (
    <box halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
      <SquareCover player={player} />
    </box>
  ) as Gtk.Widget;

  return (
    <box
      cssClasses={["bar-media-big"]}
      widthRequest={350}
      heightRequest={132}
      overflow={Gtk.Overflow.HIDDEN}
    >
      <Gtk.Overlay
        hexpand
        child={bg}
        $={(overlay: Gtk.Overlay) => {
          overlay.add_overlay(content);
          overlay.add_overlay(mediaSelectButton);
          for (const layer of playerCavaLayers) {
            overlay.add_overlay(layer);
          }
          overlay.add_overlay(cover);
          overlay.add_overlay(mediaSelect);
        }}
      />
    </box>
  ) as Gtk.Widget;
}

export default function BigMedia() {
  const { TOP } = Astal.WindowAnchor;
  let container: Gtk.Box;
  let windowRef: Gtk.Widget | null = null;
  let disposeScope: (() => void) | null = null;

  function rebuild() {
    if (!container) return;

    // Dispose previous tracking scope
    if (disposeScope) {
      disposeScope();
      disposeScope = null;
    }

    clearChildren(container);
    closeSelector();

    const player = getSelectedPlayer();
    if (!player) {
      // No players left — hide the window
      if (windowRef) windowRef.visible = false;
      return;
    }


    // Create JSX inside a tracked scope so ags can manage cleanup
    const [dispose, view] = createRoot((dispose) => {
      const v = buildPlayerView(player);
      return [dispose, v];
    });

    disposeScope = dispose;
    container.append(view as Gtk.Widget);
  }

  return (
    <window
      name={"big-media"}
      visible={false}
      anchor={TOP}
      application={app}
      defaultWidth={-1}
      exclusivity={Astal.Exclusivity.IGNORE}
      // @ts-ignore
      keymode={Astal.Keymode.PASSIVE}
      marginTop={46}
      $={(self) => {
        windowRef = self;

        self.set_default_size(1, 1);
        self.connect("notify::visible", () => {
          if (!self.visible) closeSelector();
        });
      }}
    >
      <box
        $={(self: Gtk.Box) => {
          container = self;
          rebuild();
          onSelectedChanged(rebuild);
          mpris.connect("notify::players", rebuild);
        }}
      />
    </window>
  );
}