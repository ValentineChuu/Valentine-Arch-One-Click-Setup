import GLib from "gi://GLib"

export interface Emoji {
  emoji: string
  name: string
}

let emojiCache: Emoji[] | null = null

const FAVORITES_PATH = `${GLib.get_user_cache_dir()}/ags/emoji-favorites.json`

let favoritesCache: string[] | null = null

/** Load favorite emoji list from disk. */
export function loadFavorites(): string[] {
  if (favoritesCache) return favoritesCache

  if (!GLib.file_test(FAVORITES_PATH, GLib.FileTest.EXISTS)) {
    favoritesCache = []
    return favoritesCache
  }

  try {
    const [ok, data] = GLib.file_get_contents(FAVORITES_PATH)
    if (ok) {
      favoritesCache = JSON.parse(new TextDecoder().decode(data))
      if (!Array.isArray(favoritesCache)) favoritesCache = []
    } else {
      favoritesCache = []
    }
  } catch (_) {
    favoritesCache = []
  }

  return favoritesCache!
}

/** Save favorite emoji list to disk. */
function saveFavorites(): void {
  const dir = GLib.path_get_dirname(FAVORITES_PATH)
  GLib.mkdir_with_parents(dir, 0o755)

  try {
    GLib.file_set_contents(FAVORITES_PATH, JSON.stringify(favoritesCache ?? []))
  } catch (e) {
    console.warn("Failed to save emoji favorites:", e)
  }
}

/** Add an emoji to favorites. Returns true if it was added (not already present). */
export function addFavorite(emoji: string): boolean {
  const favs = loadFavorites()
  if (favs.includes(emoji)) return false
  favs.push(emoji)
  favoritesCache = favs
  saveFavorites()
  return true
}

/** Remove an emoji from favorites. Returns true if it was removed. */
export function removeFavorite(emoji: string): boolean {
  const favs = loadFavorites()
  const idx = favs.indexOf(emoji)
  if (idx === -1) return false
  favs.splice(idx, 1)
  favoritesCache = favs
  saveFavorites()
  return true
}

/** Check if an emoji is favorited. */
export function isFavorite(emoji: string): boolean {
  return loadFavorites().includes(emoji)
}

/** Get all favorited emojis as Emoji objects. */
export function getFavoriteEmojis(): Emoji[] {
  const favs = loadFavorites()
  const all = loadEmojis()
  return favs
    .map(e => all.find(a => a.emoji === e))
    .filter((e): e is Emoji => e !== undefined)
}

/** Parse the system emoji-test.txt file into a searchable list. */
function loadEmojis(): Emoji[] {
  if (emojiCache) return emojiCache

  const paths = [
    "/usr/share/unicode/emoji/emoji-test.txt",
    "/usr/share/unicode-emoji/emoji-test.txt",
    "/usr/lib/unicode/emoji/emoji-test.txt",
  ]

  let contents = ""
  for (const path of paths) {
    if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
      try {
        const [ok, data] = GLib.file_get_contents(path)
        if (ok) {
          contents = new TextDecoder().decode(data)
          break
        }
      } catch (_) { }
    }
  }

  if (!contents) {
    console.warn("Could not find emoji-test.txt")
    emojiCache = []
    return emojiCache
  }

  const result: Emoji[] = []

  for (const line of contents.split("\n")) {
    if (!line.includes("; fully-qualified")) continue

    const hashIndex = line.indexOf("#")
    if (hashIndex === -1) continue

    const after = line.slice(hashIndex + 1).trim()
    const spaceIndex = after.indexOf(" ")
    if (spaceIndex === -1) continue

    const emoji = after.slice(0, spaceIndex)
    const rest = after.slice(spaceIndex + 1).trim()

    const nameMatch = rest.match(/^E\d+\.\d+\s+(.+)$/)
    if (!nameMatch) continue

    const name = nameMatch[1].toLowerCase()
    result.push({ emoji, name })
  }

  emojiCache = result
  return emojiCache
}

/** Search emojis by name. Empty query returns all emojis. */
export function searchEmojis(query: string): Emoji[] {
  const all = loadEmojis()
  if (!query) return all

  const terms = query.toLowerCase().split(/\s+/)
  return all.filter(e =>
    terms.every(t => e.name.includes(t))
  )
}