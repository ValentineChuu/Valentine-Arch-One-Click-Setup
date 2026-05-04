/** Resolve a battery icon name from percentage and charging state. */
export function batteryIconName(percentage: number, charging: boolean): string {
  let icon = "battery-missing"
  if (percentage < 0.1) icon = "battery-level-0"
  if (percentage > 0.1) icon = "battery-level-10"
  if (percentage > 0.2) icon = "battery-level-20"
  if (percentage > 0.3) icon = "battery-level-30"
  if (percentage > 0.4) icon = "battery-level-40"
  if (percentage > 0.5) icon = "battery-level-50"
  if (percentage > 0.6) icon = "battery-level-60"
  if (percentage > 0.7) icon = "battery-level-70"
  if (percentage > 0.8) icon = "battery-level-80"
  if (percentage > 0.9) icon = "battery-level-90"
  if (percentage == 1) icon = "battery-level-100"

  if (charging && percentage == 1) {
    icon = icon + "-charged"
  } else if (charging) {
    icon = icon + "-charging"
  }
  return icon + "-symbolic"
}
