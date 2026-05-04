import GLib from "gi://GLib";

// Firefox only sends cover art once per video visit. If you navigate
// away and return, the art path is never re-sent. This cache maps
// title → file path so we can restore art on revisit.
const artCache = new Map<string, string>();
const ART_CACHE_MAX = 500;

/** Cache a cover art path for a title. */
export function cacheArt(title: string | null, path: string) {
  if (!title || !path) return;
  // Move to end if already exists (refreshes recency)
  artCache.delete(title);
  artCache.set(title, path);
  // Evict oldest entries if over limit
  while (artCache.size > ART_CACHE_MAX) {
    const oldest = artCache.keys().next().value;
    if (oldest !== undefined) artCache.delete(oldest);
    else break;
  }
}

/** Look up a cached cover art path. Returns the path only if the file still exists. */
export function getCachedArt(title: string | null): string | null {
  if (!title) return null;
  const path = artCache.get(title);
  if (!path) return null;
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    artCache.delete(title);
    return null;
  }
  return path;
}