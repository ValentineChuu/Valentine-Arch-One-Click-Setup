// @ts-ignore
import Bluez from "gi://AstalBluetooth"
// @ts-ignore
import Wp from "gi://AstalWp"
import Pango from "gi://Pango"
import app from "ags/gtk4/app"
import { createState, createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import { stopBluetooth, setPower, getSortedDevices, bluetoothSummary, registerAgent, setPairingRequestHandler, setPairingDoneHandler, setCurrentPairingReject, rejectPendingPairing, type PairingRequest } from "../../../utils/system/bluetooth"
import { PairedDevice, DiscoveredDevice } from "./bluetooth/bluetoothDevice"

// Register the D-Bus agent once at startup
registerAgent()

export default function Bluetooth() {
  const bluetooth = Bluez.get_default()
  const wp = Wp.get_default()
  const speaker = wp?.audio?.defaultSpeaker
  const [expanded, setExpanded] = createState(false)
  const [scanning, setScanning] = createState(false)
  const [scanStarted, setScanStarted] = createState(false)
  const [devices, setDevices] = createState<Bluez.Device[]>([])
  const [discoveredDevices, setDiscoveredDevices] = createState<{ name: string, address: string }[]>([])

  // Pairing dialog state
  const [pairingRequest, setPairingRequest] = createState<PairingRequest | null>(null)
  const [pairingPin, setPairingPin] = createState("")

  setDevices(getSortedDevices())
  createBinding(bluetooth, "devices")((devs) => {
    setDevices(getSortedDevices())
    return devs
  })

  const label = createBinding(bluetooth, "devices")((devs: Bluez.Device[]) =>
    bluetoothSummary(devs, bluetooth.is_powered, speaker?.description ?? "")
  )

  // Wire up the agent callbacks
  setPairingRequestHandler((req: PairingRequest) => {
    setPairingRequest(req)
    setPairingPin("")
    if (req.type === "pin" || req.type === "passkey-input") {
      setCurrentPairingReject(req.reject)
    } else {
      setCurrentPairingReject(req.reject)
    }
  })

  setPairingDoneHandler(() => {
    setPairingRequest(null)
    setPairingPin("")
    setCurrentPairingReject(null)
  })

  // Reset when settings window closes
  app.connect("window-toggled", (_: any, window: any) => {
    if (window.name === "settings" && !window.visible) {
      resetState()
    }
  })

  const resetState = () => {
    setExpanded(false)
    setScanStarted(false)
    setDiscoveredDevices([])
    rejectPendingPairing()
    setPairingRequest(null)
    setPairingPin("")
    if (scanning()) {
      stopBluetooth()
      setScanning(false)
    }
  }

  const toggleBluetooth = () => {
    setPower(!bluetooth.is_powered).catch(console.error)
    if (bluetooth.is_powered) {
      resetState()
    }
  }

  const startScan = () => {
    setScanning(true)
    setScanStarted(true)
    setDiscoveredDevices([])
    try {
      bluetooth.adapter?.start_discovery()
    } catch (e) {
      console.error("Failed to start discovery:", e)
      setScanning(false)
      setScanStarted(false)
      return
    }
    bluetooth.connect("device-added", (_self: any, device: Bluez.Device) => {
      if (!device.name || device.paired) return
      setDiscoveredDevices(prev => {
        if (prev.find(d => d.address === device.address)) return prev
        return [...prev, { name: device.name, address: device.address }]
      })
    })
  }

  const collapseAndStopScan = () => {
    setExpanded(false)
    setScanStarted(false)
    setDiscoveredDevices([])
    rejectPendingPairing()
    setPairingRequest(null)
    setPairingPin("")
    if (scanning()) {
      stopBluetooth()
      setScanning(false)
    }
  }

  const confirmPairing = () => {
    const req = pairingRequest()
    if (!req) return
    if (req.type === "confirm" || req.type === "display-passkey") {
      req.resolve()
    } else if (req.type === "pin") {
      req.resolve(pairingPin())
    } else if (req.type === "passkey-input") {
      const num = parseInt(pairingPin(), 10)
      if (!isNaN(num)) req.resolve(num)
    }
  }

  const rejectPairing = () => {
    const req = pairingRequest()
    if (!req) return
    req.reject()
  }

  return (
    <box cssClasses={["setting-bt"]} orientation={Gtk.Orientation.VERTICAL}>

      <box spacing={8}>
        <button onClicked={toggleBluetooth}>
          <image iconName={createBinding(bluetooth, "is_powered")((powered) =>
            powered ? "bluetooth-active-symbolic" : "bluetooth-disabled-symbolic"
          )} />
        </button>
        <label hexpand halign={Gtk.Align.START} label={label} />
        <button
          onClicked={() => expanded() ? collapseAndStopScan() : setExpanded(true)}
        >
          <image iconName={expanded(e => e ? "pan-down-symbolic" : "go-next-symbolic")} />
        </button>
      </box>

      <revealer
        revealChild={expanded(e => e && bluetooth.is_powered)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2} marginTop={4}>

          {/* Paired devices */}
          <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <For each={devices}>
              {(device) => (
                <PairedDevice
                  device={device}
                  onUnpair={() => {
                    // Remove from local list immediately, then sync with BlueZ
                    setDevices(prev => prev.filter(d => d.address !== device.address))
                  }}
                />
              )}
            </For>
          </box>

          {/* Pairing dialog */}
          <revealer
            revealChild={pairingRequest(r => r !== null)}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <box
              cssClasses={["setting-bt-pairing"]}
              orientation={Gtk.Orientation.VERTICAL}
              spacing={4}
              marginTop={4}
              marginBottom={4}
              marginStart={8}
              marginEnd={8}
            >
              <box
                cssClasses={["setting-bt-pair-confirmation"]}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
              >
                <label
                  marginTop={4}
                  marginStart={8}
                  marginEnd={8}
                  wrap={true}
                  wrapMode={Pango.WrapMode.WORD}
                  justify={Gtk.Justification.FILL}
                  label={pairingRequest(r => {
                    if (!r) return ""
                    if (r.type === "confirm") return `Confirm pairing with ${r.device}?`
                    if (r.type === "display-passkey") return `Enter this code on ${r.device}:`
                    if (r.type === "pin") return `Enter PIN for ${r.device}:`
                    if (r.type === "passkey-input") return `Enter passkey for ${r.device}:`
                    return ""
                  })}
                />

                {/* Show passkey for confirm / display-passkey */}
                <label
                  cssClasses={["setting-bt-passkey"]}
                  marginBottom={4}
                  visible={pairingRequest(r => r?.type === "confirm" || r?.type === "display-passkey")}
                  label={pairingRequest(r => {
                    if (r?.type === "confirm" || r?.type === "display-passkey") return r.passkey
                    return ""
                  })}
                />
              </box>

              {/* Pin/passkey entry for pin / passkey-input */}
              <entry
                visible={pairingRequest(r => r?.type === "pin" || r?.type === "passkey-input")}
                hexpand
                placeholderText={pairingRequest(r => r?.type === "pin" ? "PIN" : "Passkey")}
                onNotifyText={(self) => setPairingPin(self.text)}
                onActivate={confirmPairing}
              />

              <box>
                <button onClicked={rejectPairing} halign={Gtk.Align.START}>
                  <label label="Cancel" />
                </button>

                <box hexpand />

                <button onClicked={confirmPairing} halign={Gtk.Align.END}>
                  <label label="Confirm" />
                </button>
              </box>
            </box>
          </revealer>

          <Gtk.Separator marginTop={4} marginBottom={4} />

          {/* Scan button — hidden after scan started */}
          <revealer
            revealChild={scanStarted(s => !s)}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <button onClicked={startScan}>
              <box spacing={8} halign={Gtk.Align.CENTER}>
                <image iconName="bluetooth-symbolic" />
                <label label="Scan for devices" />
              </box>
            </button>
          </revealer>

          {/* Discovered devices */}
          <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <For each={discoveredDevices}>
              {(device) => (
                <DiscoveredDevice
                  device={device}
                  onPair={() => {
                    setDevices(getSortedDevices())
                    setDiscoveredDevices(prev => prev.filter(d => d.address !== device.address))
                  }}
                />
              )}
            </For>
          </box>

        </box>
      </revealer>

    </box>
  )
}