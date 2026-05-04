/** Resolve a battery icon name from percentage and charging state. */
export function batteryIconName(percentage: number, charging: boolean): string {
  if (charging) return "battery-charging-symbolic"
  if (percentage > 0.9) return "battery-full-symbolic"
  if (percentage > 0.6) return "battery-good-symbolic"
  if (percentage > 0.3) return "battery-medium-symbolic"
  if (percentage > 0.1) return "battery-low-symbolic"
  return "battery-caution-symbolic"
}
