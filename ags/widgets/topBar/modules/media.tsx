// @ts-ignore
import Mpris from "gi://AstalMpris";
import app from "ags/gtk4/app";
import { createRoot } from "ags";
import { Gtk } from "ags/gtk4";
import GLib from "gi://GLib";
import { mpris, getSelectedPlayer, onSelectedChanged } from "../../../utils/media/mpris";
import CoverArt from "./media/coverArt";
import { ProgressBar } from "./media/trackInfo";
import { createBarCavaOverlays } from "./media/cava";

const POLL_MS = 1000;

function PlayerWidget({ player }: { player: Mpris.Player }) {
  const pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
    player.notify("position");
    player.notify("length");
    player.notify("title");
    player.notify("cover-art");
    return GLib.SOURCE_CONTINUE;
  });

  function addHover(revealer: Gtk.Revealer) {
    const motion = new Gtk.EventControllerMotion();
    motion.connect("enter", () => {
      revealer.revealChild = true;
    });
    motion.connect("leave", () => {
      revealer.revealChild = false;
    });
    revealer.add_controller(motion);
  }

  const controls = (
    <box
      heightRequest={34}
      spacing={26}
      valign={Gtk.Align.CENTER}
    >
      <revealer
        widthRequest={40}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
        transitionDuration={200}
        revealChild={false}
        $={(self: Gtk.Revealer) => addHover(self)}
      >
        <button
          cssClasses={["emptyButton"]}
          halign={Gtk.Align.END}
          marginEnd={14}
          iconName="media-skip-backward-symbolic"
          onClicked={() => player.previous()}
        />
      </revealer>
      <CoverArt player={player} />
      <revealer
        widthRequest={40}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
        transitionDuration={200}
        revealChild={false}
        $={(self: Gtk.Revealer) => addHover(self)}
      >
        <button
          cssClasses={["emptyButton"]}
          halign={Gtk.Align.START}
          marginStart={14}
          iconName="media-skip-forward-symbolic"
          onClicked={() => player.next()}
        />
      </revealer>
    </box>
  ) as Gtk.Widget;

  const cavaLayers = createBarCavaOverlays();

  const progressBar = (
    <box
      hexpand
      valign={Gtk.Align.END}
      overflow={Gtk.Overflow.HIDDEN}
      marginStart={5}
      marginEnd={5}
      canTarget={false}
      $={(self: Gtk.Box) => {
        const update = () => {
          self.visible = player.length > 0;
        };
        update();
        player.connect("notify::length", update);
        player.connect("notify::title", () => {
          self.visible = false;
          update();
        });
      }}
    >
      <ProgressBar player={player} />
    </box>
  ) as Gtk.Widget;

  const cavaOverlay = (
    <Gtk.Overlay
      child={controls}
      $={(self: Gtk.Overlay) => {
        for (const layer of cavaLayers) {
          self.add_overlay(layer);
        }
      }}
    />
  ) as Gtk.Widget;

  return (
    <Gtk.Overlay
      child={cavaOverlay}
      $={(self: Gtk.Overlay) => {
        self.add_overlay(progressBar);
        self.connect("destroy", () => GLib.source_remove(pollId));

        // Click on non-control areas toggles big-media
        const click = new Gtk.GestureClick();
        click.connect("released", () => {
          app.toggle_window("big-media");
        });
        self.add_controller(click);
      }}
    />
  );
}

export default function Media() {
  let container: Gtk.Box;
  let disposeScope: (() => void) | null = null;

  function rebuild() {
    if (!container) return;

    // Dispose previous tracking scope
    if (disposeScope) {
      disposeScope();
      disposeScope = null;
    }

    // Remove old children
    let child = container.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      container.remove(child);
      child = next;
    }

    const player = getSelectedPlayer();
    if (!player) return;

    // Create JSX inside a tracked scope so ags can manage cleanup
    const [dispose, widget] = createRoot((dispose) => {
      const w = PlayerWidget({ player });
      return [dispose, w];
    });

    disposeScope = dispose;
    container.append(widget as Gtk.Widget);
  }

  return (
    <box
      cssClasses={["bar-media"]}
      orientation={Gtk.Orientation.VERTICAL}
      $={(self: Gtk.Box) => {
        container = self;
        rebuild();
        onSelectedChanged(rebuild);
        mpris.connect("notify::players", rebuild);
      }}
    />
  );
}