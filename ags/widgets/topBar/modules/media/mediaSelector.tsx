import { Gtk } from "ags/gtk4";
import { mpris, getSelectedPlayer, setSelectedPlayer, onSelectedChanged, getPlayerName } from "../../../../utils/media/mpris";
import { getAppIcon } from "../../../../utils/system/appIcons";

let _selectorOpen = false;
let _selectorListeners: (() => void)[] = [];

function notifySelector() {
  for (const fn of _selectorListeners) fn();
}

export function toggleSelector() {
  _selectorOpen = !_selectorOpen;
  notifySelector();
}

export function closeSelector() {
  if (!_selectorOpen) return;
  _selectorOpen = false;
  notifySelector();
}

function onSelectorChanged(fn: () => void) {
  _selectorListeners.push(fn);
}

export function clearChildren(box: Gtk.Box) {
  let child = box.get_first_child();
  while (child) {
    const next = child.get_next_sibling();
    box.remove(child);
    child = next;
  }
}

export default function MediaSelector() {
  let listBox: Gtk.Box;

  function rebuild() {
    if (!listBox) return;
    clearChildren(listBox);

    const players = mpris.get_players();
    const selected = getSelectedPlayer();

    for (const player of players) {
      const isSelected = player === selected;
      const name = getPlayerName(player);
      const icon = getAppIcon(name);

      const rowBox = new Gtk.Box({ spacing: 8 });

      const img = new Gtk.Image({ iconName: icon, pixelSize: 20 });
      rowBox.append(img);

      const sep = new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL });
      rowBox.append(sep);

      const titleLabel = new Gtk.Label({
        label: player.title || name,
        xalign: 0,
        hexpand: true,
        ellipsize: 3,
      });
      titleLabel.add_css_class("media-select-title");
      rowBox.append(titleLabel);

      const btn = new Gtk.Button({ child: rowBox });
      btn.add_css_class("media-select-row");
      if (isSelected) btn.add_css_class("media-select-active");
      btn.connect("clicked", () => {
        setSelectedPlayer(player);
        closeSelector();
      });

      listBox.append(btn);
    }
  }

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
      transitionDuration={200}
      revealChild={false}
      $={(self: Gtk.Revealer) => {
        onSelectorChanged(() => {
          self.revealChild = _selectorOpen;
          if (_selectorOpen) rebuild();
        });
      }}
    >
      <Gtk.ScrolledWindow
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        maxContentHeight={150}
        propagateNaturalHeight
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={4}
          $={(self: Gtk.Box) => {
            listBox = self;
            rebuild();
            mpris.connect("notify::players", rebuild);
            onSelectedChanged(rebuild);
          }}
        />
      </Gtk.ScrolledWindow>
    </revealer>
  );
}