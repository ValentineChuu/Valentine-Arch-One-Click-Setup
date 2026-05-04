import { For } from "ags"
import { Gtk } from "ags/gtk4"
import { isUrl, extractDomain, getFaviconPath } from "../../../utils/launcher/search_result/search"

export default function SearchResult({ history, onSelect, selectedIndex, setSelectedIndex }: {
  history: any
  onSelect: (query: string) => void
  selectedIndex: any
  setSelectedIndex: (i: number) => void
}) {
  return (
    <box cssClasses={["launcher-results"]} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <For each={history((list: string[]) => list)}>
        {(entry: string, index) => {
          let faviconPath: string | null = null

          if (isUrl(entry)) {
            const domain = extractDomain(entry)
            if (domain) faviconPath = getFaviconPath(domain)
          }

          return (
            <button
              cssClasses={selectedIndex((i: number) => {
                const classes = ["launcher-app"]
                if (i === index()) classes.push("launcher-app-selected")
                return classes
              })}
              onClicked={() => onSelect(entry)}
              $={(self) => {
                const motion = new Gtk.EventControllerMotion()
                motion.connect("enter", () => setSelectedIndex(index()))
                self.add_controller(motion)
              }}
            >
              <box spacing={8}>
                {faviconPath ? (
                  <image file={faviconPath} pixelSize={20} cssClasses={["launcher-app-icon"]} />
                ) : (
                  <image iconName="system-search-symbolic" pixelSize={20} cssClasses={["launcher-app-icon"]} />
                )}
                <label
                  label={entry}
                  halign={Gtk.Align.START}
                  hexpand
                  cssClasses={["launcher-app-name"]}
                  ellipsize={3}
                />
              </box>
            </button>
          )
        }}
      </For>

      <label
        visible={history((list: string[]) => list.length === 0)}
        label="No search history"
        cssClasses={["launcher-empty"]}
        halign={Gtk.Align.CENTER}
        marginTop={16}
        marginBottom={16}
      />

      <label
        visible={history((list: string[]) => list.length > 0)}
        label="Press Enter to search the web"
        cssClasses={["launcher-empty"]}
        halign={Gtk.Align.CENTER}
        marginTop={8}
        marginBottom={4}
      />
    </box>
  )
}