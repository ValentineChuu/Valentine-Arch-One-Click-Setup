import { Gtk } from "ags/gtk4"

export default function SearchBar({ onSearch, onActivate, onKeyPressed, sortButton }: {
  onSearch: (query: string) => void
  onActivate: () => void
  onKeyPressed?: (keyval: number) => boolean
  sortButton?: JSX.Element | null
}) {
  return (
    <box cssClasses={["launcher-search"]} spacing={8}>
      <image iconName="system-search-symbolic" />
      <entry
        hexpand
        placeholderText="Search applications..."
        cssClasses={["launcher-entry"]}
        onNotifyText={(self) => onSearch(self.text)}
        onActivate={onActivate}
        $={(self) => {
          if (onKeyPressed) {
            const keyController = new Gtk.EventControllerKey()
            keyController.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
            keyController.connect("key-pressed", (_ctrl, keyval) => {
              return onKeyPressed(keyval)
            })
            self.add_controller(keyController)
          }

          self.connect("map", () => {
            const root = self.get_root()
            if (!root) return
            root.connect("notify::visible", () => {
              if (root.visible) {
                self.text = ""
                self.grab_focus()
              }
            })
          })
        }}
      />
      {sortButton ?? <box />}
    </box>
  )
}