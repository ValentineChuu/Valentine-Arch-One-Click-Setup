import Gio from "gi://Gio"

export type SortType = "name-asc" | "name-desc" | "date-asc" | "date-desc" | "type"

export const SORT_LABELS: Record<SortType, string> = {
  "name-asc": "Name A→Z",
  "name-desc": "Name Z→A",
  "date-asc": "Oldest first",
  "date-desc": "Newest first",
  "type": "By type",
}

export const SORT_ICONS: Record<SortType, string> = {
  "name-asc": "view-sort-ascending-symbolic",
  "name-desc": "view-sort-descending-symbolic",
  "date-asc": "document-open-recent-symbolic",
  "date-desc": "document-open-recent-symbolic",
  "type": "view-list-symbolic",
}

export const SORT_ORDER: SortType[] = ["name-asc", "name-desc", "date-asc", "date-desc", "type"]

export function nextSortType(current: SortType): SortType {
  const idx = SORT_ORDER.indexOf(current)
  return SORT_ORDER[(idx + 1) % SORT_ORDER.length]
}

export interface Sortable {
  name: string
  path: string
  isDir: boolean
}

function getExt(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot).toLowerCase()
}

function getModTime(path: string): number {
  try {
    const file = Gio.File.new_for_path(path)
    const info = file.query_info("time::modified", Gio.FileQueryInfoFlags.NONE, null)
    const dt = info.get_modification_date_time()
    return dt ? dt.to_unix() : 0
  } catch (_) {
    return 0
  }
}

export function sortFiles<T extends Sortable>(files: T[], sortType: SortType): T[] {
  const sorted = [...files]

  switch (sortType) {
    case "name-asc":
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      break

    case "name-desc":
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return b.name.localeCompare(a.name)
      })
      break

    case "date-asc":
    case "date-desc": {
      const times = new Map<string, number>()
      for (const f of sorted) {
        times.set(f.path, getModTime(f.path))
      }
      const mul = sortType === "date-asc" ? 1 : -1
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return mul * ((times.get(a.path) ?? 0) - (times.get(b.path) ?? 0))
      })
      break
    }

    case "type":
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        const extA = getExt(a.name)
        const extB = getExt(b.name)
        if (extA !== extB) return extA.localeCompare(extB)
        return a.name.localeCompare(b.name)
      })
      break
  }

  return sorted
}