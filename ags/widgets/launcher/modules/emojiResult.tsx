import Gdk from "gi://Gdk"
import { createState, createEffect } from "ags"
import { Gtk } from "ags/gtk4"
import { Emoji, isFavorite, addFavorite, removeFavorite, getFavoriteEmojis } from "../../../utils/launcher/search_result/emoji"
import { LazyLoader } from "../../../utils/launcher/lazyload"
import { copyToClipboard } from "../../../utils/system/clipboard"

export default function EmojiResult({ emojis, onSelect, selectedIndex, setSelectedIndex, onColumnsDetected }: {
  emojis: any
  onSelect: () => void
  selectedIndex: any
  setSelectedIndex: (i: number) => void
  onColumnsDetected: (cols: number) => void
}) {
  const [favorites, setFavorites] = createState<Emoji[]>(getFavoriteEmojis())
  const [favRevision, setFavRevision] = createState(0)

  const refreshFavorites = () => {
    setFavorites(getFavoriteEmojis())
    setFavRevision(favRevision() + 1)
  }

  let favFlowBox: Gtk.FlowBox | null = null
  let mainFlowBox: Gtk.FlowBox | null = null
  let loader: LazyLoader | null = null
  let widgetButtons: Gtk.Button[] = []
  let lastHighlighted = -1
  const allStars = new Map<string, Gtk.Image[]>()

  const createEmojiItem = (emoji: Emoji, index: number, isSelectable: boolean): Gtk.Widget => {
    const overlay = new Gtk.Overlay()
    const btn = new Gtk.Button({
      cssClasses: ["launcher-emoji-item"],
      label: emoji.emoji,
    })
    // FIXED: Used connect("clicked", ...) instead of an onClicked prop.
    btn.connect("clicked", () => {
      copyToClipboard(emoji.emoji)
      onSelect()
    })
    overlay.set_child(btn)

    const star = new Gtk.Image({
      iconName: "starred-symbolic",
      halign: Gtk.Align.END,
      valign: Gtk.Align.START,
      marginEnd: 4,
      marginTop: 4,
      visible: isFavorite(emoji.emoji),
    })
    overlay.add_overlay(star)

    if (!allStars.has(emoji.emoji)) allStars.set(emoji.emoji, [])
    allStars.get(emoji.emoji)?.push(star)

    if (isSelectable) {
      const motion = new Gtk.EventControllerMotion()
      motion.connect("enter", () => setSelectedIndex(index))
      btn.add_controller(motion)
    }

    const rightClick = new Gtk.GestureClick()
    rightClick.set_button(Gdk.BUTTON_SECONDARY)
    rightClick.connect("pressed", () => {
      if (isFavorite(emoji.emoji)) {
        removeFavorite(emoji.emoji)
      } else {
        addFavorite(emoji.emoji)
      }
      refreshFavorites()
      rightClick.set_state(Gtk.EventSequenceState.CLAIMED)
    })
    overlay.add_controller(rightClick)

    if (isSelectable) {
      widgetButtons[index] = btn
    }
    return overlay
  }

  createEffect(() => {
    const list = emojis() as Emoji[]
    widgetButtons = []
    lastHighlighted = -1
    allStars.clear()
    if (loader) {
      loader.load(list, (emoji, idx) => createEmojiItem(emoji, idx, true))
    }
  })

  createEffect(() => {
    const idx = selectedIndex() as number
    if (lastHighlighted >= 0 && lastHighlighted < widgetButtons.length) {
      widgetButtons[lastHighlighted]?.set_css_classes(["launcher-emoji-item"])
    }
    if (idx >= 0 && idx < widgetButtons.length) {
      widgetButtons[idx]?.set_css_classes(["launcher-emoji-item", "launcher-app-selected"])
    }
    lastHighlighted = idx
  })

  createEffect(() => {
    favRevision() // depend on revision
    for (const [char, stars] of allStars) {
      const isFav = isFavorite(char)
      for (const star of stars) {
        star.set_visible(isFav)
      }
    }
  })

  createEffect(() => {
    const favs = favorites()
    if (!favFlowBox) return
    let child = favFlowBox.get_first_child()
    while (child) {
      favFlowBox.remove(child)
      child = child.get_next_sibling()
    }
    favs.forEach((emoji) => {
      favFlowBox!.append(createEmojiItem(emoji, -1, false))
    })
  })

  return (
    <box cssClasses={["launcher-results"]} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      {/* Favorites grid */}
      <box
        visible={favorites(f => f.length > 0)}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={2}
      >
        <label
          cssClasses={["launcher-emoji-section-label"]}
          label="Favorites"
          halign={Gtk.Align.START}
          marginStart={8}
          marginTop={4}
        />
        <Gtk.FlowBox
          // FIXED: Replaced 'ref' with the '$' prop and added type for 'self'.
          $={(self: Gtk.FlowBox) => favFlowBox = self}
          cssClasses={["launcher-emoji-grid"]}
          homogeneous
          maxChildrenPerLine={10}
          minChildrenPerLine={5}
          selectionMode={Gtk.SelectionMode.NONE}
        />
        <Gtk.Separator marginTop={4} marginBottom={4} />
      </box>

      {/* Main results grid */}
      <Gtk.FlowBox
        // FIXED: Replaced 'ref' with the '$' prop and added type for 'self'.
        $={(self: Gtk.FlowBox) => {
          if (self && !mainFlowBox) {
            mainFlowBox = self
            loader = new LazyLoader(self)
            onColumnsDetected(self.get_max_children_per_line())
            self.connect("notify::max-children-per-line", () => {
              onColumnsDetected(self.get_max_children_per_line())
            })
          }
        }}
        cssClasses={["launcher-emoji-grid"]}
        homogeneous
        maxChildrenPerLine={10}
        minChildrenPerLine={5}
        selectionMode={Gtk.SelectionMode.NONE}
      />
    </box>
  )
}