// @ts-ignore
import Apps from "gi://AstalApps?version=0.1"

const apps = Apps.Apps.new()
const iconCache = new Map<string, string>()

/**
 * Resolve an application icon from a window class name.
 * Uses fuzzy matching via AstalApps with a cache layer to avoid
 * repeated lookups for the same class.
 */
export function getAppIcon(clientClass: string, fallback = "application-x-executable"): string {
  if (!clientClass) return fallback

  const cached = iconCache.get(clientClass)
  if (cached) return cached

  try {
    const matched = apps.fuzzy_query(clientClass)
    if (matched?.length > 0 && matched[0].iconName) {
      iconCache.set(clientClass, matched[0].iconName)
      return matched[0].iconName
    }
  } catch (_) {}

  iconCache.set(clientClass, fallback)
  return fallback
}
