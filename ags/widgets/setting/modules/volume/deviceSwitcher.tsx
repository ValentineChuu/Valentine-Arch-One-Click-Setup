// @ts-ignore
import Wp from "gi://AstalWp"
import app from "ags/gtk4/app"
import { createState, createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"

export default function DeviceSwitcher({
  devices,
  current,
}: {
  devices: any
  current: Wp.Endpoint
}) {
  const [expanded, setExpanded] = createState(false)
  app.connect("window-toggled", (_: any, window: any) => {
    if (window.name === "settings" && !window.visible) {
      setExpanded(false)
    }
  })

  const currentLabel = createBinding(current, "description")((d: string) => d ?? "Unknown")

  const switchTo = async (endpoint: any) => {
    try {
      const id = endpoint.id
      if (id == null) return

      // 1. Set as default for future streams
      await execAsync(`wpctl set-default ${id}`)

      // 2. Move all current playback streams to the new default
      // this bash command: bash -c "pactl list short sink-inputs | awk '{print $1}' | while read sid; do pactl move-sink-input \\"$sid\\" @DEFAULT_SINK@; done"
      try {
        const output = await execAsync("pactl list short sink-inputs")
        for (const line of output.trim().split("\n")) {
          const streamId = line.split("\t")[0]
          if (streamId) {
            execAsync(`pactl move-sink-input ${streamId} @DEFAULT_SINK@`).catch(() => { })
          }
        }
      } catch {
        // No active streams
      }

      setExpanded(false)
    } catch (e) {
      console.error("Failed to switch device:", e)
    }
  }

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <button
        cssClasses={["setting-device-item", "setting-device-active"]}
        onClicked={() => setExpanded(!expanded())}
      >
        <box spacing={8}>
          <image iconName="emblem-default-symbolic" />
          <label
            hexpand
            halign={Gtk.Align.START}
            label={currentLabel}
          />
          <image iconName={expanded(e => e ? "pan-down-symbolic" : "go-next-symbolic")} />
        </box>
      </button>
      <revealer
        revealChild={expanded}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          <For each={devices}>
            {(endpoint) => {
              const ep = endpoint as Wp.Endpoint
              const isDefault = createBinding(ep, "is_default")

              return (
                <button
                  visible={isDefault((d: boolean) => !d)}
                  cssClasses={["setting-device-item"]}
                  onClicked={() => switchTo(ep)}
                >
                  <box spacing={8}>
                    <image iconName="audio-card-symbolic" />
                    <label
                      hexpand
                      halign={Gtk.Align.START}
                      label={createBinding(ep, "description")((d: string) => d ?? "Unknown")}
                    />
                  </box>
                </button>
              )
            }}
          </For>
        </box>
      </revealer>
    </box>
  )
}