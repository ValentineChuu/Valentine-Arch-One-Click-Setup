// @ts-ignore
import Bluez from "gi://AstalBluetooth"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

// ── D-Bus Agent ──────────────────────────────────────────────────────

const AGENT_PATH = "/org/bluez/agent/ags"
const AGENT_IFACE = "org.bluez.Agent1"

const AGENT_XML = `
<node>
  <interface name="${AGENT_IFACE}">
    <method name="Release" />
    <method name="RequestPinCode">
      <arg direction="in" type="o" name="device" />
      <arg direction="out" type="s" />
    </method>
    <method name="DisplayPinCode">
      <arg direction="in" type="o" name="device" />
      <arg direction="in" type="s" name="pincode" />
    </method>
    <method name="RequestPasskey">
      <arg direction="in" type="o" name="device" />
      <arg direction="out" type="u" />
    </method>
    <method name="DisplayPasskey">
      <arg direction="in" type="o" name="device" />
      <arg direction="in" type="u" name="passkey" />
      <arg direction="in" type="q" name="entered" />
    </method>
    <method name="RequestConfirmation">
      <arg direction="in" type="o" name="device" />
      <arg direction="in" type="u" name="passkey" />
    </method>
    <method name="RequestAuthorization">
      <arg direction="in" type="o" name="device" />
    </method>
    <method name="AuthorizeService">
      <arg direction="in" type="o" name="device" />
      <arg direction="in" type="s" name="uuid" />
    </method>
    <method name="Cancel" />
  </interface>
</node>
`

export type PairingRequest = {
  type: "confirm"
  device: string
  passkey: string
  resolve: () => void
  reject: () => void
} | {
  type: "pin"
  device: string
  resolve: (pin: string) => void
  reject: () => void
} | {
  type: "passkey-input"
  device: string
  resolve: (passkey: number) => void
  reject: () => void
} | {
  type: "display-passkey"
  device: string
  passkey: string
  resolve: () => void
  reject: () => void
}

let onPairingRequest: ((req: PairingRequest) => void) | null = null
let onPairingDone: (() => void) | null = null
let registrationId: number | null = null

export function setPairingRequestHandler(handler: (req: PairingRequest) => void) {
  onPairingRequest = handler
}

export function setPairingDoneHandler(handler: () => void) {
  onPairingDone = handler
}

/** Extract device name from D-Bus object path like /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX */
function deviceNameFromPath(path: string): string {
  try {
    const bluetooth = Bluez.get_default()
    const addr = path.split("/").pop()?.replace(/^dev_/, "").replace(/_/g, ":") ?? ""
    const device = bluetooth.get_devices().find((d: Bluez.Device) => d.address === addr)
    return device?.name ?? addr
  } catch {
    return path.split("/").pop() ?? "Unknown"
  }
}

function handleMethodCall(
  _connection: any,
  _sender: string,
  _objectPath: string,
  _interfaceName: string,
  methodName: string,
  parameters: any,
  invocation: any,
) {
  switch (methodName) {
    case "Release":
      invocation.return_value(null)
      break

    case "RequestConfirmation": {
      const devicePath = parameters.get_child_value(0).get_string()[0]
      const passkey = parameters.get_child_value(1).get_uint32()
      const name = deviceNameFromPath(devicePath)
      const padded = String(passkey).padStart(6, "0")

      if (onPairingRequest) {
        onPairingRequest({
          type: "confirm",
          device: name,
          passkey: padded,
          resolve: () => {
            invocation.return_value(null)
            onPairingDone?.()
          },
          reject: () => {
            invocation.return_dbus_error("org.bluez.Error.Rejected", "Pairing rejected")
            onPairingDone?.()
          },
        })
      } else {
        invocation.return_value(null)
      }
      break
    }

    case "RequestPinCode": {
      const devicePath = parameters.get_child_value(0).get_string()[0]
      const name = deviceNameFromPath(devicePath)

      if (onPairingRequest) {
        onPairingRequest({
          type: "pin",
          device: name,
          resolve: (pin: string) => {
            invocation.return_value(new GLib.Variant("(s)", [pin]))
            onPairingDone?.()
          },
          reject: () => {
            invocation.return_dbus_error("org.bluez.Error.Rejected", "Pairing rejected")
            onPairingDone?.()
          },
        })
      } else {
        invocation.return_dbus_error("org.bluez.Error.Rejected", "No handler")
      }
      break
    }

    case "RequestPasskey": {
      const devicePath = parameters.get_child_value(0).get_string()[0]
      const name = deviceNameFromPath(devicePath)

      if (onPairingRequest) {
        onPairingRequest({
          type: "passkey-input",
          device: name,
          resolve: (passkey: number) => {
            invocation.return_value(new GLib.Variant("(u)", [passkey]))
            onPairingDone?.()
          },
          reject: () => {
            invocation.return_dbus_error("org.bluez.Error.Rejected", "Pairing rejected")
            onPairingDone?.()
          },
        })
      } else {
        invocation.return_dbus_error("org.bluez.Error.Rejected", "No handler")
      }
      break
    }

    case "DisplayPasskey": {
      const devicePath = parameters.get_child_value(0).get_string()[0]
      const passkey = parameters.get_child_value(1).get_uint32()
      const name = deviceNameFromPath(devicePath)
      const padded = String(passkey).padStart(6, "0")

      if (onPairingRequest) {
        onPairingRequest({
          type: "display-passkey",
          device: name,
          passkey: padded,
          resolve: () => onPairingDone?.(),
          reject: () => onPairingDone?.(),
        })
      }
      invocation.return_value(null)
      break
    }

    case "DisplayPinCode":
      invocation.return_value(null)
      break

    case "RequestAuthorization":
      invocation.return_value(null)
      break

    case "AuthorizeService":
      invocation.return_value(null)
      break

    case "Cancel":
      onPairingDone?.()
      invocation.return_value(null)
      break

    default:
      invocation.return_dbus_error(
        "org.freedesktop.DBus.Error.UnknownMethod",
        `Unknown method: ${methodName}`,
      )
  }
}

export function registerAgent() {
  try {
    const bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, null)
    const nodeInfo = Gio.DBusNodeInfo.new_for_xml(AGENT_XML)
    const ifaceInfo = nodeInfo.lookup_interface(AGENT_IFACE)
    if (!ifaceInfo) {
      console.error("Failed to find agent interface in XML")
      return
    }

    registrationId = bus.register_object(
      AGENT_PATH,
      ifaceInfo,
      handleMethodCall,
      null,
      null,
    )

    // Register with BlueZ as the default agent
    bus.call_sync(
      "org.bluez",
      "/org/bluez",
      "org.bluez.AgentManager1",
      "RegisterAgent",
      new GLib.Variant("(os)", [AGENT_PATH, "KeyboardDisplay"]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
    )

    bus.call_sync(
      "org.bluez",
      "/org/bluez",
      "org.bluez.AgentManager1",
      "RequestDefaultAgent",
      new GLib.Variant("(o)", [AGENT_PATH]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
    )
  } catch (e) {
    console.error("Failed to register bluetooth agent:", e)
  }
}

/** Reject any pending pairing request. Call on panel close. */
let currentPairingReject: (() => void) | null = null

export function setCurrentPairingReject(reject: (() => void) | null) {
  currentPairingReject = reject
}

export function rejectPendingPairing() {
  if (currentPairingReject) {
    currentPairingReject()
    currentPairingReject = null
  }
}

// ── Device operations ────────────────────────────────────────────────

export const stopBluetooth = () => {
  try {
    const bluetooth = Bluez.get_default()
    if (bluetooth.adapter?.discovering) {
      bluetooth.adapter.stop_discovery()
    }
  } catch (_) {
    // Ignore — discovery may not be running or adapter may not exist
  }
}

export const connectDevice = (address: string) =>
  execAsync(`bluetoothctl connect ${address}`)

export const disconnectDevice = (address: string) =>
  execAsync(`bluetoothctl disconnect ${address}`)

export const removeDevice = async (address: string) => {
  // Disconnect first if connected
  try {
    await execAsync(`bluetoothctl disconnect ${address}`)
  } catch (_) {
    // May not be connected, that's fine
  }

  // Use D-Bus adapter RemoveDevice for reliability
  const objPath = `/org/bluez/hci0/dev_${address.replace(/:/g, "_")}`
  try {
    const bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, null)
    bus.call_sync(
      "org.bluez",
      "/org/bluez/hci0",
      "org.bluez.Adapter1",
      "RemoveDevice",
      new GLib.Variant("(o)", [objPath]),
      null,
      Gio.DBusCallFlags.NONE,
      5000,
      null,
    )
  } catch (e: any) {
    // If D-Bus fails, fall back to bluetoothctl
    if (!e.toString().includes("Does Not Exist")) {
      await execAsync(`bluetoothctl remove ${address}`)
    }
  }
}

export const setPower = (on: boolean) =>
  execAsync(`bluetoothctl power ${on ? "on" : "off"}`)

/**
 * Pair a device using D-Bus directly so our registered agent handles
 * the passkey/pin prompts instead of bluetoothctl's built-in agent.
 */
export const pairDevice = (address: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const objPath = `/org/bluez/hci0/dev_${address.replace(/:/g, "_")}`
    const bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, null)

    // Pair (async — waits for user confirmation via agent)
    bus.call(
      "org.bluez",
      objPath,
      "org.bluez.Device1",
      "Pair",
      null,
      null,
      Gio.DBusCallFlags.NONE,
      60000,
      null,
      (_bus: any, result: any) => {
        try {
          bus.call_finish(result)
        } catch (e) {
          reject(e)
          return
        }

        // Trust
        try {
          bus.call_sync(
            "org.bluez",
            objPath,
            "org.freedesktop.DBus.Properties",
            "Set",
            new GLib.Variant("(ssv)", [
              "org.bluez.Device1",
              "Trusted",
              new GLib.Variant("b", true),
            ]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
          )
        } catch (e) {
          console.error("Failed to trust device:", e)
        }

        // Connect
        bus.call(
          "org.bluez",
          objPath,
          "org.bluez.Device1",
          "Connect",
          null,
          null,
          Gio.DBusCallFlags.NONE,
          30000,
          null,
          (_bus2: any, result2: any) => {
            try {
              bus.call_finish(result2)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        )
      },
    )
  })
}

/** Get paired devices sorted with connected first. */
export const getSortedDevices = () => {
  const bluetooth = Bluez.get_default()
  return bluetooth.get_devices()
    .filter((d: Bluez.Device) => d.name && d.paired)
    .sort((a: Bluez.Device, b: Bluez.Device) => {
      if (a.connected && !b.connected) return -1
      if (!a.connected && b.connected) return 1
      return 0
    })
}

/** Build a summary label for the bluetooth header. */
export function bluetoothSummary(
  devs: Bluez.Device[],
  isPowered: boolean,
  speakerName: string
): string {
  if (!isPowered) return "Disabled"
  const connected = devs.filter((d: Bluez.Device) => d.connected)
  if (connected.length === 0) return "Disconnected"

  const preferred = connected.length === 1
    ? connected[0]
    : connected.find((d: Bluez.Device) =>
      speakerName.toLowerCase().includes(d.name?.toLowerCase() ?? "") ||
      d.name?.toLowerCase().includes(speakerName.toLowerCase())
    ) ?? connected[0]

  const battery = preferred.battery_percentage > 0
    ? ` — ${Math.round(preferred.battery_percentage * 100)}%`
    : ""
  return `${preferred.name}${battery}`
}

/** Resolve bluetooth icon from power and connection state. */
export function bluetoothIcon(powered: boolean, connected: boolean): string {
  if (!powered) return "bluetooth-disabled-symbolic"
  if (connected) return "bluetooth-active-symbolic"
  return "bluetooth-disconnected-symbolic"
}

/** Get battery percentage string for the preferred connected device. */
export function preferredDeviceBattery(
  devices: Bluez.Device[],
  speakerName: string
): string {
  const connected = devices.filter((d: Bluez.Device) => d.connected)
  if (connected.length === 0) return ""

  const preferred = connected.length === 1
    ? connected[0]
    : connected.find((d: Bluez.Device) =>
      speakerName.toLowerCase().includes(d.name?.toLowerCase() ?? "") ||
      d.name?.toLowerCase().includes(speakerName.toLowerCase())
    ) ?? connected[0]

  return preferred.battery_percentage > 0
    ? `${Math.round(preferred.battery_percentage * 100)}%`
    : ""
}