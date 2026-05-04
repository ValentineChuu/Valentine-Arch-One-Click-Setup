import { For, createBinding, createState } from "ags"
import { getAppIcon } from "../../../utils/system/appIcons"
import Hyprland from "../../../utils/system/hyprland"
import Configs from "../../../utils/config";

const DEFAULT_ALLOCATION = Configs.workspace.allocation;

export default function Workspaces() {
  const lastFocusedByWs = new Map<number, any>()

  const getWorkspaceList = () => {
    const wss: any[] = Hyprland.get_workspaces()
    const focusedClient = Hyprland.get_focused_client()

    const normal = wss
      .filter((ws: any) => ws.get_id() > 0)
      .sort((a: any, b: any) => a.get_id() - b.get_id())

    const occupied = normal.filter((ws: any) => ws.get_clients().length > 0)

    const maxOccupiedId = occupied.length
      ? Math.max(...occupied.map((ws: any) => ws.get_id()))
      : 0

    const max = Math.max(DEFAULT_ALLOCATION, maxOccupiedId)

    return [...Array(max)].map((_, i) => {
      const id = i + 1
      const ws = normal.find((w: any) => w.get_id() === id)
      const clients: any[] = ws ? ws.get_clients() : []
      const isOccupied = clients.length > 0

      // IMPORTANT: clear stale memory when workspace is empty
      if (!isOccupied) {
        lastFocusedByWs.delete(id)
      }

      const representativeClient =
        focusedClient &&
          focusedClient.get_workspace()?.get_id() === id
          ? focusedClient
          : lastFocusedByWs.get(id) ?? clients[0]

      const icon =
        isOccupied && representativeClient
          ? getAppIcon(representativeClient.get_class())
          : null

      return {
        id,
        occupied: isOccupied,
        visible: id <= DEFAULT_ALLOCATION || isOccupied,
        icon,
      }
    })
  }

  const [workspaces, setWorkspaces] = createState(getWorkspaceList())
  const refresh = () => setWorkspaces(getWorkspaceList())

  Hyprland.connect("workspace-added", refresh)
  Hyprland.connect("workspace-removed", refresh)
  Hyprland.connect("client-added", refresh)
  Hyprland.connect("client-moved", refresh)
  Hyprland.connect("client-removed", refresh)

  Hyprland.connect("notify::focused-client", () => {
    const client = Hyprland.get_focused_client()
    if (client) {
      const wsId = client.get_workspace()?.get_id()
      if (wsId) lastFocusedByWs.set(wsId, client)
    }
    refresh()
  })

  const focusedId = createBinding(Hyprland, "focused-workspace")(
    (ws: any) => ws?.get_id() ?? -1
  )

  return (
    <box cssClasses={["bar-ws"]} spacing={2}>
      <For each={workspaces}>
        {(ws) => (
          <button
            visible={ws.visible}
            cssClasses={focusedId((fid) => {
              const classes: string[] = []
              if (ws.id === fid) classes.push("focused")
              if (ws.occupied) classes.push("occupied")
              return classes
            })}
            onClicked={() => {
              if (focusedId() !== ws.id) {
                Hyprland.dispatch("workspace", String(ws.id))
              }
            }}
          >
            {ws.icon && <image iconName={ws.icon} />}
          </button>
        )}
      </For>
    </box>
  )
}