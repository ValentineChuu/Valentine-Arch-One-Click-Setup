import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { execAsync } from "ags/process"

const MAX_SEARCH_HISTORY = 10
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), "ags"])
const SEARCH_HISTORY_PATH = GLib.build_filenamev([CACHE_DIR, "search-history.json"])
const FAVICON_DIR = GLib.build_filenamev([CACHE_DIR, "favicons"])

let searchHistoryCache: string[] | null = null

// ─── Search History ───

export function getSearchHistory(): string[] {
  if (searchHistoryCache) return [...searchHistoryCache]

  if (!GLib.file_test(SEARCH_HISTORY_PATH, GLib.FileTest.EXISTS)) {
    searchHistoryCache = []
    return []
  }

  try {
    const [ok, data] = GLib.file_get_contents(SEARCH_HISTORY_PATH)
    if (ok) {
      const parsed = JSON.parse(new TextDecoder().decode(data))
      if (Array.isArray(parsed)) {
        searchHistoryCache = parsed.filter(s => typeof s === "string").slice(0, MAX_SEARCH_HISTORY)
        return [...searchHistoryCache]
      }
    }
  } catch (_) { }

  searchHistoryCache = []
  return []
}

export function recordSearch(query: string): void {
  const history = getSearchHistory()
  const filtered = history.filter(s => s !== query)
  filtered.unshift(query)
  searchHistoryCache = filtered.slice(0, MAX_SEARCH_HISTORY)

  GLib.mkdir_with_parents(CACHE_DIR, 0o755)
  try {
    GLib.file_set_contents(SEARCH_HISTORY_PATH, JSON.stringify(searchHistoryCache))
  } catch (e) {
    console.warn("Failed to save search history:", e)
  }

  // Pre-download favicon for URL entries
  if (isUrl(query)) {
    const domain = extractDomain(query)
    if (domain) downloadFavicon(domain)
  }

  // Clean up orphaned favicons
  cleanOrphanedFavicons()
}

// ─── URL detection ───

export function isUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}(\/\S*)?$/.test(input)) return true
  if (/^localhost(:\d+)?(\/\S*)?$/.test(input)) return true
  return false
}

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export function extractDomain(input: string): string | null {
  try {
    const withProto = ensureProtocol(input)
    const match = withProto.match(/^https?:\/\/([^/?#]+)/)
    return match ? match[1] : null
  } catch (_) {
    return null
  }
}

// ─── Favicons ───

export function getFaviconPath(domain: string): string | null {
  const path = GLib.build_filenamev([FAVICON_DIR, `${domain}.png`])
  if (GLib.file_test(path, GLib.FileTest.EXISTS)) return path
  return null
}

export function downloadFavicon(domain: string): void {
  GLib.mkdir_with_parents(FAVICON_DIR, 0o755)
  const outPath = GLib.build_filenamev([FAVICON_DIR, `${domain}.png`])
  if (GLib.file_test(outPath, GLib.FileTest.EXISTS)) return

  try {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    const file = Gio.File.new_for_uri(url)
    const outFile = Gio.File.new_for_path(outPath)
    file.copy(outFile, Gio.FileCopyFlags.OVERWRITE, null, null)
  } catch (_) {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    execAsync(["curl", "-sL", "-o", outPath, "--max-time", "5", url]).catch(() => { })
  }
}

/** Delete cached favicons whose domains are no longer in search history. */
function cleanOrphanedFavicons(): void {
  if (!GLib.file_test(FAVICON_DIR, GLib.FileTest.IS_DIR)) return

  // Collect domains that are still in history
  const history = getSearchHistory()
  const activeDomains = new Set<string>()
  for (const entry of history) {
    if (isUrl(entry)) {
      const domain = extractDomain(entry)
      if (domain) activeDomains.add(domain)
    }
  }

  // Walk favicon dir and delete orphans
  try {
    const dir = Gio.File.new_for_path(FAVICON_DIR)
    const enumerator = dir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)
    let info: Gio.FileInfo | null
    while ((info = enumerator.next_file(null)) !== null) {
      const name = info.get_name()
      if (!name.endsWith(".png")) continue
      const domain = name.slice(0, -4)
      if (!activeDomains.has(domain)) {
        try {
          const child = dir.get_child(name)
          child.delete(null)
        } catch (_) { }
      }
    }
    enumerator.close(null)
  } catch (_) { }
}

export function searchWeb(query: string): void {
  recordSearch(query)

  const url = isUrl(query)
    ? ensureProtocol(query)
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`

  execAsync(["xdg-open", url]).catch(console.error)
}