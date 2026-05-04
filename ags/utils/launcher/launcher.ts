export type LauncherMode = "apps" | "search" | "emoji" | "file" | "category"

export interface ParsedCommand {
  mode: LauncherMode
  query: string
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()
  const match = trimmed.match(/^\/(search|s|emoji|e|file|f|category|c)(?:\s+(.*))?$/i)
  if (!match) return { mode: "apps", query: trimmed }

  const cmd = match[1].toLowerCase()
  const query = (match[2] ?? "").trim()

  switch (cmd) {
    case "search": case "s": return { mode: "search", query }
    case "emoji": case "e": return { mode: "emoji", query }
    case "file": case "f": return { mode: "file", query }
    case "category": case "c": return { mode: "category", query }
    default: return { mode: "apps", query: trimmed }
  }
}