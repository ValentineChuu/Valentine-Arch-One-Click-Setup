import { execAsync } from "ags/process"

/** Copy text to clipboard via wl-copy. */
export function copyToClipboard(text: string): void {
  execAsync(`wl-copy "${text}"`).catch(console.error)
}