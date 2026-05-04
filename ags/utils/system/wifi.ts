// @ts-ignore
import Network from "gi://AstalNetwork"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

let scanTimeoutId: number | null = null
let scanIntervalId: number | null = null

export const stopWifiScan = () => {
  if (scanTimeoutId !== null) {
    GLib.source_remove(scanTimeoutId)
    scanTimeoutId = null
  }
  if (scanIntervalId !== null) {
    GLib.source_remove(scanIntervalId)
    scanIntervalId = null
  }
}

export const setScanTimeoutId = (id: number | null) => { scanTimeoutId = id }
export const setScanIntervalId = (id: number | null) => { scanIntervalId = id }
export const getScanIntervalId = () => scanIntervalId

export function strengthIcon(strength: number): string {
  const level = strength > 80 ? "excellent"
    : strength > 60 ? "good"
    : strength > 40 ? "ok"
    : strength > 20 ? "weak"
    : "none"
  return `network-wireless-signal-${level}-symbolic`
}

export const connectToNetwork = (ssid: string, password?: string): Promise<string> => {
  const cmd = password
    ? `nmcli device wifi connect "${ssid}" password "${password}"`
    : `nmcli device wifi connect "${ssid}"`
  return execAsync(cmd)
}

/** Deduplicate access points by SSID, excluding the currently connected one. */
export function filterAccessPoints(network: Network.Network): any[] {
  const aps = network.wifi?.get_access_points() ?? []
  const seen = new Set<string>()
  return aps
    .filter((ap: any) => {
      if (!ap.ssid || seen.has(ap.ssid)) return false
      seen.add(ap.ssid)
      if (ap.ssid === network.wifi?.ssid) return false
      return true
    })
    .sort((a: any, b: any) => b.strength - a.strength)
}