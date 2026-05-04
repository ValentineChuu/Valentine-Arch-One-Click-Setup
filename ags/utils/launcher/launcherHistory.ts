// @ts-ignore
import Apps from "gi://AstalApps?version=0.1"
import GLib from "gi://GLib"

const apps = Apps.Apps.new()
const MAX_HISTORY = 20
const CACHE_PATH = `${GLib.get_user_cache_dir()}/ags/launcher-history.json`

const DEFAULT_IDS = ["firefox", "files", "blueman-manager", "pavucontrol"]

interface HistoryEntry {
  name: string
  launches: number
}

let frequencyMap: Map<string, number> = new Map()
let lastOpened: string | null = null

function loadHistory(): HistoryEntry[] {
  try {
    if (GLib.file_test(CACHE_PATH, GLib.FileTest.EXISTS)) {
      const [ok, contents] = GLib.file_get_contents(CACHE_PATH)
      if (ok) {
        const parsed = JSON.parse(new TextDecoder().decode(contents))
        if (Array.isArray(parsed)) {
          // Migration: old format was string[], new format is HistoryEntry[]
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            return parsed.map((name: string) => ({ name, launches: 1 }))
          }
          return parsed
        }
      }
    }
  } catch (_) { }
  return DEFAULT_IDS.map(name => ({ name, launches: 0 }))
}

function saveHistory(): void {
  try {
    const dir = GLib.path_get_dirname(CACHE_PATH)
    if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
      GLib.mkdir_with_parents(dir, 0o755)
    }
    const entries: HistoryEntry[] = Array.from(frequencyMap.entries())
      .map(([name, launches]) => ({ name, launches }))
      .sort((a, b) => b.launches - a.launches)
      .slice(0, MAX_HISTORY)
    GLib.file_set_contents(CACHE_PATH, JSON.stringify(entries))
  } catch (e) {
    console.error("Failed to save launcher history:", e)
  }
}

// Initialize frequency map from disk
const initialEntries = loadHistory()
for (const entry of initialEntries) {
  frequencyMap.set(entry.name, entry.launches)
}

function resolveApp(name: string): Apps.Application | null {
  const results = apps.fuzzy_query(name)
  return results?.length > 0 ? results[0] : null
}

/**
 * Get the default app list sorted by: last opened first, then frequency, then defaults.
 */
export function getHistory(): Apps.Application[] {
  const sorted = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])

  const ordered: string[] = []

  // Last opened always first
  if (lastOpened) {
    ordered.push(lastOpened)
  }

  // Then by frequency
  for (const [name] of sorted) {
    if (!ordered.includes(name)) ordered.push(name)
  }

  // Fill with defaults if needed
  for (const id of DEFAULT_IDS) {
    if (!ordered.includes(id)) ordered.push(id)
  }

  return ordered
    .map(resolveApp)
    .filter((a): a is Apps.Application => a !== null)
}

/** Record a launch: bump frequency on disk, set last opened in memory. */
export function recordLaunch(app: Apps.Application): void {
  const name = app.name ?? ""
  if (!name) return

  lastOpened = name
  frequencyMap.set(name, (frequencyMap.get(name) ?? 0) + 1)
  saveHistory()
}