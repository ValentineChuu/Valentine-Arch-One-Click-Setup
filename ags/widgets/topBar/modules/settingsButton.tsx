import app from "ags/gtk4/app"

export default function SettingButton() {
  return (
    <button cssClasses={["bar-setting"]} onClicked={() => app.toggle_window("settings")}>
      <image iconName="system-run-symbolic" />
    </button>
  )
}
