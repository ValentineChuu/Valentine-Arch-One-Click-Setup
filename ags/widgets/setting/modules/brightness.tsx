import { createBinding, onCleanup } from "ags"
import GObject, { register, getter, setter } from "ags/gobject"
import { monitorFile, readFileAsync } from "ags/file"
import { exec, execAsync } from "ags/process"
import CustomBar from "../../../utils/widget/customBar"

const screenDevice = exec(`bash -c "ls -w1 /sys/class/backlight | head -1"`)

/**
 * Singleton that tracks and sets screen brightness via brightnessctl.
 * Monitors the sysfs brightness file for external changes (e.g. hardware keys).
 */
@register({ GTypeName: "SettingsBrightness" })
class Brightness extends GObject.Object {
  static instance: Brightness
  static get_default() {
    if (!this.instance) this.instance = new Brightness()
    return this.instance
  }

  #hasBacklight = false
  #screenMax = 0
  #screen = 0
  #settingScreen = false

  constructor() {
    super()
    this.#hasBacklight = exec(`bash -c "ls /sys/class/backlight"`).length > 0
    if (!this.#hasBacklight) return

    try {
      this.#screenMax = Number(exec("brightnessctl max"))
      this.#screen = Number(exec("brightnessctl get")) / this.#screenMax

      const monitor = monitorFile(
        `/sys/class/backlight/${screenDevice}/brightness`,
        async (f) => {
          if (this.#settingScreen) return
          const v = await readFileAsync(f)
          const newValue = Number(v) / this.#screenMax
          if (Math.abs(this.#screen - newValue) > 0.001) {
            this.#screen = newValue
            this.notify("screen")
          }
        }
      )

      onCleanup(() => monitor?.cancel?.())
    } catch (_) {
      this.#hasBacklight = false
    }
  }

  @getter(Boolean) get hasBacklight() { return this.#hasBacklight }
  @getter(Number) get screen() { return this.#screen }

  @setter(Number)
  set screen(percent: number) {
    if (!this.#hasBacklight) return
    percent = Math.max(0.01, Math.min(1, percent))
    this.#screen = percent
    this.notify("screen")

    this.#settingScreen = true
    execAsync(`brightnessctl -d ${screenDevice} set ${Math.floor(percent * 100)}% -q`)
      .then(() => setTimeout(() => this.#settingScreen = false, 200))
      .catch(() => this.#settingScreen = false)
  }
}

export default function BrightnessSlider() {
  const brightness = Brightness.get_default()

  return (
    <box
      cssClasses={["setting-brightness", "slider-row"]}
      orientation={1}
      visible={brightness.hasBacklight}
    >
      <box spacing={8}>
        <button>
          <image iconName="display-brightness-symbolic" />
        </button>

        <CustomBar
          value={createBinding(brightness, "screen")}
          onChangeValue={(v) => { brightness.screen = v }}
        />

        <label
          canTarget={false}
          halign={3}
          widthRequest={36}
          label={createBinding(brightness, "screen")((v: number) => `${Math.round(v * 100)}%`)}
        />
      </box>
    </box>
  )
}