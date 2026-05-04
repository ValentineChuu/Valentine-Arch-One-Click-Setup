// @ts-ignore
import Apps from "gi://AstalApps?version=0.1"
import Gdk from "gi://Gdk"
import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { createState } from "ags"
import { getHistory, recordLaunch } from "../../utils/launcher/launcherHistory"
import { parseCommand, LauncherMode } from "../../utils/launcher/launcher"
import { searchEmojis, Emoji } from "../../utils/launcher/search_result/emoji"
import { searchWeb, getSearchHistory } from "../../utils/launcher/search_result/search"
import { searchFiles, FileResult, openFile, listDirectory } from "../../utils/launcher/search_result/file"
import { sortFiles, nextSortType, SORT_LABELS, SORT_ICONS, SortType } from "../../utils/launcher/sort"
import { copyToClipboard } from "../../utils/system/clipboard"
import SearchBar from "./modules/searchBar"
import AppResult from "./modules/appResult"
import EmojiResult from "./modules/emojiResult"
import FileResultList from "./modules/fileResult"
import SearchResult from "./modules/searchResult"

const apps = Apps.Apps.new()

export default function Launcher() {
  const [mode, setMode] = createState<LauncherMode>("apps")
  const [results, setResults] = createState<Apps.Application[]>(getHistory())
  const [query, setQuery] = createState("")
  const [selectedIndex, setSelectedIndex] = createState(0)
  const [emojis, setEmojis] = createState<Emoji[]>([])
  const [files, setFiles] = createState<FileResult[]>([])
  const [searchHistory, setSearchHistory] = createState<string[]>([])
  const [fileSortType, setFileSortType] = createState<SortType>("name-asc")

  let emojiCols = 8
  // Keep raw unsorted results so re-sorting doesn't require re-searching
  let rawFileResults: FileResult[] = []

  const getVisibleResults = (): Apps.Application[] => {
    const seen = new Set<string>()
    return results().filter(a => {
      const id = a.name ?? a.iconName ?? ""
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }

  const launchApp = (appToLaunch: Apps.Application) => {
    recordLaunch(appToLaunch)
    appToLaunch.launch()
    close()
  }

  const search = (input: string) => {
    const parsed = parseCommand(input)
    setMode(parsed.mode)
    setQuery(input)
    setSelectedIndex(0)

    switch (parsed.mode) {
      case "apps":
        if (!parsed.query) {
          setResults(getHistory())
        } else {
          setResults(apps.fuzzy_query(parsed.query) ?? [])
        }
        break

      case "emoji":
        setEmojis(searchEmojis(parsed.query))
        break

      case "file":
        searchFiles(parsed.query).then(applySortAndSet).catch(() => applySortAndSet([]))
        break

      case "search": {
        const history = getSearchHistory()
        if (parsed.query) {
          const terms = parsed.query.toLowerCase().split(/\s+/)
          setSearchHistory(history.filter(h =>
            terms.every(t => h.toLowerCase().includes(t))
          ))
        } else {
          setSearchHistory(history)
        }
        break
      }
    }
  }

  const activate = () => {
    const parsed = parseCommand(query())

    switch (parsed.mode) {
      case "search": {
        const filtered = searchHistory()
        const idx = selectedIndex()
        if (filtered.length > 0 && idx >= 0 && idx < filtered.length) {
          searchWeb(filtered[idx])
          close()
        } else if (parsed.query) {
          searchWeb(parsed.query)
          close()
        }
        break
      }

      case "emoji": {
        const list = emojis()
        const idx = selectedIndex()
        if (list.length > 0) {
          const target = (idx >= 0 && idx < list.length) ? list[idx] : list[0]
          copyToClipboard(target.emoji)
          close()
        }
        break
      }

      case "file": {
        const list = files()
        const idx = selectedIndex()
        if (list.length > 0 && idx >= 0 && idx < list.length) {
          const file = list[idx]
          if (file.isDir) {
            const contents = listDirectory(file.path)
            setSelectedIndex(0)
            applySortAndSet(contents)
          } else {
            openFile(file.path)
            close()
          }
        }
        break
      }

      case "apps":
      default: {
        const visible = getVisibleResults()
        const idx = selectedIndex()
        if (visible.length > 0 && idx >= 0 && idx < visible.length) {
          launchApp(visible[idx])
        }
        break
      }
    }
  }

  const close = () => {
    app.toggle_window("launcher")
    setMode("apps")
    setResults(getHistory())
    setQuery("")
    setSelectedIndex(0)
    setEmojis([])
    setFiles([])
    setSearchHistory([])
    rawFileResults = []
  }

  const getMaxIndex = (): number => {
    switch (mode()) {
      case "emoji": return emojis().length - 1
      case "file": return files().length - 1
      case "apps": return getVisibleResults().length - 1
      case "search": return searchHistory().length - 1
      default: return 0
    }
  }

  const applySortAndSet = (raw: FileResult[]) => {
    rawFileResults = raw
    setFiles(sortFiles(raw, fileSortType()))
  }

  const cycleSortType = () => {
    const next = nextSortType(fileSortType())
    setFileSortType(next)
    setSelectedIndex(0)
    setFiles(sortFiles(rawFileResults, next))
  }

  const sortButton = (
    <button
      visible={mode(m => m === "file")}
      cssClasses={["launcher-sort-button"]}
      tooltipText={fileSortType(t => SORT_LABELS[t])}
      onClicked={cycleSortType}
    >
      <image iconName={fileSortType(t => SORT_ICONS[t])} pixelSize={16} />
    </button>
  )

  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      name="launcher"
      visible={false}
      application={app}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      keymode={Astal.Keymode.ON_DEMAND}
      exclusivity={Astal.Exclusivity.IGNORE}
      $={(self) => {
        self.set_default_size(1, 1)

        const keyController = new Gtk.EventControllerKey()
        keyController.connect("key-pressed", (_self, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            close()
            return true
          }

          const max = getMaxIndex()
          const idx = selectedIndex()

          if (keyval === Gdk.KEY_Down) {
            setSelectedIndex(Math.min(idx + 1, max))
            return true
          }

          if (keyval === Gdk.KEY_Up) {
            setSelectedIndex(Math.max(idx - 1, 0))
            return true
          }

          if (keyval === Gdk.KEY_Tab) {
            setSelectedIndex(Math.min(idx + 1, max))
            return true
          }

          return false
        })
        self.add_controller(keyController)

        const click = new Gtk.GestureClick()
        click.connect("released", () => close())
        self.add_controller(click)
      }}
    >
      <box
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["launcher"]}
          widthRequest={500}
          $={(self) => {
            const click = new Gtk.GestureClick()
            click.connect("released", () => {
              click.set_state(Gtk.EventSequenceState.CLAIMED)
            })
            self.add_controller(click)
          }}
        >
          <SearchBar
            onSearch={search}
            onActivate={activate}
            sortButton={sortButton}
          />
          <Gtk.Separator cssClasses={["launcher-separator"]} />

          <Gtk.ScrolledWindow
            vexpand
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            cssClasses={["launcher-scroll"]}
            heightRequest={400}
          >
            <box orientation={Gtk.Orientation.VERTICAL}>
              <box visible={mode(m => m === "apps")} orientation={Gtk.Orientation.VERTICAL}>
                <AppResult
                  results={results}
                  query={query}
                  onLaunch={launchApp}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                />
              </box>

              <box visible={mode(m => m === "emoji")} orientation={Gtk.Orientation.VERTICAL}>
                <EmojiResult
                  emojis={emojis}
                  onSelect={close}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  onColumnsDetected={(cols) => { emojiCols = cols }}
                />
              </box>

              <box visible={mode(m => m === "file")} orientation={Gtk.Orientation.VERTICAL}>
                <FileResultList
                  files={files}
                  onSelect={close}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  onBrowseDir={applySortAndSet}
                />
              </box>

              <box visible={mode(m => m === "search")} orientation={Gtk.Orientation.VERTICAL}>
                <SearchResult
                  history={searchHistory}
                  onSelect={(entry) => {
                    searchWeb(entry)
                    close()
                  }}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                />
              </box>
            </box>
          </Gtk.ScrolledWindow>
        </box>
      </box>
    </window>
  )
}