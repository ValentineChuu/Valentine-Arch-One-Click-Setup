// @ts-ignore
import Mpris from "gi://AstalMpris";
import { Gtk } from "ags/gtk4";
import CustomBar from "../../../../utils/widget/customBar";
import { formatTime } from "../../../../utils/media/mpris";

interface TrackInfoProps {
  player: Mpris.Player;
}

export function ProgressBar({ player }: TrackInfoProps) {
  const getValue = () => {
    const pos = player.position;
    const len = player.length;
    if (len <= 0 || isNaN(pos) || isNaN(len)) return 0;
    return Math.min(1, Math.max(0, pos / len));
  };

  // reactive wrapper so CustomBar can subscribe
  let listeners: (() => void)[] = [];
  const value = () => getValue();
  value.subscribe = (fn: () => void) => {
    listeners.push(fn);
  };

  const notify = () => {
    for (const fn of listeners) fn();
  };

  return (
    <box
      cssClasses={["media-progress-bar"]}
      hexpand
      valign={Gtk.Align.CENTER}
      $={() => {
        player.connect("notify::position", notify);
        player.connect("notify::length", notify);
      }}
    >
      <CustomBar
        value={value}
        onChangeValue={(pct: number) => {
          const len = player.length;
          if (len > 0) player.set_position(pct * len);
        }}
      />
    </box>
  );
}

export function ProgressLabel({ player }: TrackInfoProps) {
  let posLabel: Gtk.Label;
  let lenLabel: Gtk.Label;
  let lastTitle = player.title;
  let knownLength = player.length;

  function refresh() {
    const title = player.title;
    const pos = player.position;
    const len = player.length;

    if (title !== lastTitle) {
      lastTitle = title;
      knownLength = 0;
      posLabel?.set_label("0:00");
      lenLabel?.set_label("--:--");
      return;
    }

    if (knownLength > 0) {
      posLabel?.set_label(formatTime(Math.min(pos, knownLength)));
    } else {
      posLabel?.set_label(formatTime(pos));
    }

    if (len > 0 && len !== knownLength) {
      knownLength = len;
    }
    if (knownLength > 0) {
      lenLabel?.set_label(formatTime(knownLength));
    }
  }

  return (
    <box
      cssClasses={["time-labels"]}
      hexpand
      $={() => {
        player.connect("notify::position", refresh);
        player.connect("notify::length", refresh);
        player.connect("notify::title", refresh);
        refresh();
      }}
    >
      <label xalign={0} hexpand $={(self: Gtk.Label) => { posLabel = self; }} />
      <label xalign={1} $={(self: Gtk.Label) => { lenLabel = self; }} />
    </box>
  );
}