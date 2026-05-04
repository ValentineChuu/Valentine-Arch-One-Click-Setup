// @ts-ignore
import Apps from "gi://AstalApps?version=0.1"
import Pango from "gi://Pango"
import { For } from "ags"
import { Gtk } from "ags/gtk4"
import MathResult from "./mathResult"
import { evalMath } from "../../../utils/launcher/search_result/math"

function AppItem({ app, onLaunch, selected, onHover }: {
  app: Apps.Application
  onLaunch: () => void
  selected: any
  onHover: () => void
}) {

  const motion = new Gtk.EventControllerMotion()
  motion.connect("enter", () => onHover())

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button
        cssClasses={selected((s: boolean) => {
          const classes = ["launcher-app-item"]
          if (s) classes.push("launcher-app-selected")
          return classes
        })}
        onClicked={onLaunch}
        tooltipText={app.description}
        $={(self) => self.add_controller(motion)}
      >
        <box spacing={8}>
          <image iconName={app.iconName ?? "application-x-executable"} pixelSize={32} />
          <box orientation={1} hexpand>
            <label
              halign={0}
              cssClasses={["launcher-app-name"]}
              label={app.name ?? "Unknown"}
              singleLineMode
              ellipsize={Pango.EllipsizeMode.END}
            />
            {app.description && (
              <label
                halign={0}
                cssClasses={["launcher-app-desc"]}
                label={app.description}
                singleLineMode
                ellipsize={Pango.EllipsizeMode.END}
              />
            )}
          </box>
        </box>
      </button>
    </box>
  )
}

export default function AppResult({ results, onLaunch, selectedIndex, setSelectedIndex, query }: {
  results?: any
  onLaunch: (app: Apps.Application) => void
  selectedIndex: any
  setSelectedIndex: (i: number) => void
  query: any
}) {
  const hasMath = query((q: string) => evalMath(q) !== null)
  const mathExpr = query((q: string) => q.trim())
  const mathAnswer = query((q: string) => evalMath(q) ?? "")

  const getVisibleResults = results((apps: Apps.Application[]) => {
    const seen = new Set<string>()
    return apps.filter(a => {
      const id = a.name ?? a.iconName ?? ""
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  })

  return (
    <box cssClasses={["launcher-results"]} orientation={Gtk.Orientation.VERTICAL} spacing={2}>

      <box
        visible={hasMath}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={2}
      >
        <MathResult expression={mathExpr} result={mathAnswer} />
        <Gtk.Separator marginTop={4} marginBottom={4} />
      </box>

      <For each={getVisibleResults}>
        {(app, index) => {
          if (!app) return <box />
          return (
            <AppItem
              app={app}
              onLaunch={() => onLaunch(app)}
              selected={selectedIndex((i: number) => i === index())}
              onHover={() => setSelectedIndex(index())}
            />
          )
        }}
      </For>

      <label
        visible={results((apps: Apps.Application[]) => apps.length === 0)}
        label="No results"
        cssClasses={["launcher-empty"]}
        halign={Gtk.Align.CENTER}
        marginTop={16}
        marginBottom={16}
      />
    </box>
  )
}