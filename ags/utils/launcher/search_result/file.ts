import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { execAsync } from "ags/process"

export interface FileResult {
  name: string
  path: string
  isDir: boolean
  iconName: string
  previewable: boolean
  thumbnailPath: string | null
}

const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), "ags"])
const FILE_HISTORY_PATH = GLib.build_filenamev([CACHE_DIR, "file-history.json"])
const THUMB_DIR = GLib.build_filenamev([CACHE_DIR, "thumbnails"])
const MAX_FILE_HISTORY = 10

const PREVIEWABLE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico", ".tiff",
  ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv",
])

const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv",
])

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico", ".tiff",
])

// ─── File History ───

let fileHistoryCache: string[] | null = null

export function getFileHistory(): string[] {
  if (fileHistoryCache) return [...fileHistoryCache]

  if (!GLib.file_test(FILE_HISTORY_PATH, GLib.FileTest.EXISTS)) {
    fileHistoryCache = []
    return []
  }

  try {
    const [ok, data] = GLib.file_get_contents(FILE_HISTORY_PATH)
    if (ok) {
      const parsed = JSON.parse(new TextDecoder().decode(data))
      if (Array.isArray(parsed)) {
        fileHistoryCache = parsed.filter(s => typeof s === "string").slice(0, MAX_FILE_HISTORY)
        return [...fileHistoryCache]
      }
    }
  } catch (_) { }

  fileHistoryCache = []
  return []
}

export function recordFileOpen(path: string): void {
  const history = getFileHistory()
  const filtered = history.filter(s => s !== path)
  filtered.unshift(path)
  fileHistoryCache = filtered.slice(0, MAX_FILE_HISTORY)

  GLib.mkdir_with_parents(CACHE_DIR, 0o755)
  try {
    GLib.file_set_contents(FILE_HISTORY_PATH, JSON.stringify(fileHistoryCache))
  } catch (e) {
    console.warn("Failed to save file history:", e)
  }
}

export function getFileHistoryResults(): FileResult[] {
  return getFileHistory()
    .filter(p => GLib.file_test(p, GLib.FileTest.EXISTS))
    .map(p => pathToFileResult(p))
}

// ─── Thumbnail management ───

let activeThumbnails = new Set<string>()

export function updateActiveThumbnails(results: FileResult[]): void {
  const newActive = new Set<string>()
  for (const r of results) {
    if (r.thumbnailPath && r.thumbnailPath !== r.path) {
      newActive.add(r.thumbnailPath)
    }
  }

  for (const oldThumb of activeThumbnails) {
    if (!newActive.has(oldThumb) && GLib.file_test(oldThumb, GLib.FileTest.EXISTS)) {
      try {
        Gio.File.new_for_path(oldThumb).delete(null)
      } catch (_) { }
    }
  }

  activeThumbnails = newActive
}

// ─── Icon and preview detection ───

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  return dot === -1 ? "" : filename.slice(dot).toLowerCase()
}

function getIconName(filename: string, isDir: boolean): string {
  if (isDir) return "folder-symbolic"

  try {
    const [contentType] = Gio.content_type_guess(filename, null)
    if (contentType) {
      const icon = Gio.content_type_get_icon(contentType) as Gio.ThemedIcon
      if (icon?.get_names) {
        const names = icon.get_names()
        if (names?.length > 0) {
          return names.find(n => n.endsWith("-symbolic")) ?? names[0]
        }
      }
    }
  } catch (_) { }

  return "text-x-generic-symbolic"
}

function isPreviewable(filename: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(getExtension(filename))
}

function isVideo(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(filename))
}

function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(filename))
}

function getThumbnailPath(filePath: string): string | null {
  if (isImage(filePath)) return filePath

  if (isVideo(filePath)) {
    GLib.mkdir_with_parents(THUMB_DIR, 0o755)
    const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, filePath, -1)
    const thumbPath = GLib.build_filenamev([THUMB_DIR, `${hash}.png`])

    if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) return thumbPath

    execAsync(["ffmpegthumbnailer", "-i", filePath, "-o", thumbPath, "-s", "128", "-q", "8"])
      .catch(() =>
        execAsync(["ffmpeg", "-y", "-i", filePath, "-vf", "thumbnail,scale=128:-1", "-frames:v", "1", thumbPath])
          .catch(() => { })
      )

    return null
  }

  return null
}

export function pathToFileResult(path: string): FileResult {
  const name = path.split("/").at(-1) ?? path
  const isDir = GLib.file_test(path, GLib.FileTest.IS_DIR)
  const preview = !isDir && isPreviewable(name)

  return {
    name,
    path,
    isDir,
    iconName: getIconName(name, isDir),
    previewable: preview,
    thumbnailPath: preview ? getThumbnailPath(path) : null,
  }
}

// ─── Directory listing ───

export function listDirectory(dirPath: string): FileResult[] {
  const results: FileResult[] = []

  try {
    const dir = Gio.File.new_for_path(dirPath)
    const enumerator = dir.enumerate_children(
      "standard::name,standard::type",
      Gio.FileQueryInfoFlags.NONE,
      null
    )

    let info: Gio.FileInfo | null
    while ((info = enumerator.next_file(null)) !== null) {
      const name = info.get_name()
      if (name.startsWith(".")) continue
      results.push(pathToFileResult(GLib.build_filenamev([dirPath, name])))
    }

    enumerator.close(null)
  } catch (e) {
    console.warn("Failed to list directory:", e)
  }

  return results
}

// ─── Search ───
// All commands end with "; true" so bash exits 0 even on permission errors.

export async function searchFiles(query: string): Promise<FileResult[]> {
  if (!query) return getFileHistoryResults()

  const home = GLib.get_home_dir()
  const base = `find "${home}" -not -path "*/.*"`
  let cmd: string

  if (query.startsWith("/")) {
    const folderName = query.slice(1).trim()
    if (!folderName) return []
    cmd = `${base} -type d -iname "*${folderName}*" 2>/dev/null; true`
  } else if (query.startsWith(".")) {
    cmd = `${base} -type f -iname "*${query}" 2>/dev/null; true`
  } else if (/^[a-zA-Z0-9]{1,6}$/.test(query)) {
    // Short token — match as extension AND name fragment, deduplicate via sort -u.
    cmd = `{ ${base} -iname "*.${query}" 2>/dev/null; ${base} -iname "*${query}*" 2>/dev/null; } | sort -u; true`
  } else {
    cmd = `${base} -iname "*${query}*" 2>/dev/null; true`
  }

  try {
    const output = await execAsync(["bash", "-c", cmd])
    if (!output.trim()) return []
    return output.trim().split("\n").filter(Boolean).map(p => pathToFileResult(p))
  } catch (_) {
    return []
  }
}

export function shouldShowPreviews(results: FileResult[]): boolean {
  if (results.length === 0) return false
  return results.filter(r => r.previewable).length > results.length / 2
}

export function openFile(path: string): void {
  recordFileOpen(path)
  execAsync(["xdg-open", path]).catch(console.error)
}

export function openInFileManager(file: FileResult): void {
  // For directories open the dir itself; for files open the parent directory.
  const target = file.isDir ? file.path : GLib.path_get_dirname(file.path)
  execAsync(["xdg-open", target]).catch(console.error)
}