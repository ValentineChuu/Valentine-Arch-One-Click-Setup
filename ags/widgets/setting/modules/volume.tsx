// @ts-ignore
import Wp from "gi://AstalWp"
import app from "ags/gtk4/app"
import { createState, createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import CustomBar from "../../../utils/widget/customBar"
import AppVolumeRow from "./volume/appVolume"
import DeviceSwitcher from "./volume/deviceSwitcher"

function VolumeRow({
  iconName,
  value,
  onChangeValue,
  onIconClick,
  visible,
  streams,
  devices,
  currentDevice,
}: {
  iconName: any
  value: any
  onChangeValue: (v: number) => void
  onIconClick?: () => void
  visible?: any
  streams?: any
  devices?: any
  currentDevice?: any
}) {
  const [expanded, setExpanded] = createState(false)
  app.connect("window-toggled", (_: any, window: any) => {
    if (window.name === "settings" && !window.visible) {
      setExpanded(false)
    }
  })

  return (
    <box orientation={Gtk.Orientation.VERTICAL} visible={visible ?? true}>
      <box spacing={8}>
        <button onClicked={onIconClick}>
          <image iconName={iconName} />
        </button>

        <CustomBar value={value} onChangeValue={onChangeValue} />

        <label
          canTarget={false}
          halign={Gtk.Align.END}
          widthRequest={36}
          cssClasses={["slider-value"]}
          label={value((v: number) => `${Math.round(v * 100)}%`)}
        />

        <button
          onClicked={() => setExpanded(!expanded())}
        >
          <image iconName={expanded(e => e ? "pan-down-symbolic" : "go-next-symbolic")} />
        </button>
      </box>

      <revealer
        revealChild={expanded}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} marginTop={4}>
          {devices && currentDevice && (
            <DeviceSwitcher devices={devices} current={currentDevice} />
          )}

          {streams && (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} marginTop={4}>
              <For each={streams}>
                {(stream) => <AppVolumeRow stream={stream} />}
              </For>
            </box>
          )}
        </box>
      </revealer>
    </box>
  )
}

export default function VolumeSliders() {
  const wp = Wp.get_default()!
  const speaker = wp.audio.defaultSpeaker
  const microphone = wp.get_default_microphone()

  const outputStreams = createBinding(wp.audio, "streams")((streams) => streams)

  const inputStreams = createBinding(wp.audio, "recorders")((recorders) => {
    return recorders.filter((r: any) =>
      !(r.name ?? "").toLowerCase().includes("cava") &&
      !(r.description ?? "").toLowerCase().includes("cava")
    )
  })

  const outputDevices = createBinding(wp.audio, "speakers")((speakers) => speakers)
  const inputDevices = createBinding(wp.audio, "microphones")((microphones) => microphones)

  return (
    <box cssClasses={["setting-volume"]} orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <VolumeRow
        iconName={createBinding(speaker, "volumeIcon")}
        value={createBinding(speaker, "volume")}
        onChangeValue={(v) => { speaker.volume = v }}
        onIconClick={() => { speaker.mute = !speaker.mute }}
        streams={outputStreams}
        devices={outputDevices}
        currentDevice={speaker}
      />

      <VolumeRow
        iconName={createBinding(microphone, "volumeIcon")}
        value={createBinding(microphone, "volume")}
        onChangeValue={(v) => { microphone.volume = v }}
        onIconClick={() => { microphone.mute = !microphone.mute }}
        visible={createBinding(microphone, "path")((p) => p !== null)}
        streams={inputStreams}
        devices={inputDevices}
        currentDevice={microphone}
      />
    </box>
  )
}