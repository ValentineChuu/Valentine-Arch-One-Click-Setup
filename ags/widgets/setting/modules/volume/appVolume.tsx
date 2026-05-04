import { createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import CustomBar from "../../../../utils/widget/customBar"
import { getAppIcon } from "../../../../utils/system/appIcons"

export default function AppVolumeRow({ stream }: { stream: any }) {
  const name = stream.name ?? stream.description ?? "Unknown"
  const icon = getAppIcon(stream.description, "application-x-executable-symbolic")

  return (
    <box cssClasses={["setting-app-volume"]} spacing={8} marginStart={8} marginEnd={8}>
      <image iconName={icon} pixelSize={16} tooltipText={name} />
      <CustomBar
        value={createBinding(stream, "volume")}
        onChangeValue={(v) => { stream.volume = v }}
      />
      <label
        widthRequest={36}
        halign={Gtk.Align.END}
        label={createBinding(stream, "volume")((v: number) => `${Math.round(v * 100)}%`)}
      />
    </box>
  )
}