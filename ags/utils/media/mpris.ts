// @ts-ignore
import Mpris from "gi://AstalMpris"

const mpris = Mpris.get_default();

// --- Selected player state ---
let _selectedPlayer: Mpris.Player | null = null;
let _selectedListeners: (() => void)[] = [];

function _notifySelected() {
  for (const fn of _selectedListeners) fn();
}

/** Get the currently selected player (or auto-pick one). */
export function getSelectedPlayer(): Mpris.Player | null {
  const players = mpris.get_players();
  if (players.length === 0) {
    _selectedPlayer = null;
    return null;
  }

  // If the selected player is still in the list, keep it
  if (_selectedPlayer && players.includes(_selectedPlayer)) {
    return _selectedPlayer;
  }

  // Auto-select: prefer playing, else first
  const playing = players.find(
    (p: any) => p.playbackStatus === Mpris.PlaybackStatus.PLAYING,
  );
  _selectedPlayer = playing ?? players[0];
  return _selectedPlayer;
}

/** Set the selected player and notify listeners. */
export function setSelectedPlayer(player: Mpris.Player) {
  if (_selectedPlayer === player) return;
  _selectedPlayer = player;
  _notifySelected();
}

/**
 * Subscribe to selected player changes.
 * The provided function will be called whenever the selected player changes,
 * either from manual selection or from a player appearing/disappearing.
 */
export function onSelectedChanged(fn: () => void): void {
  _selectedListeners.push(fn);
}

// When the player list changes, re-evaluate the selection.
// If the selected player disappeared, auto-pick a new one and notify.
mpris.connect("notify::players", () => {
  const prev = _selectedPlayer;
  getSelectedPlayer();
  if (_selectedPlayer !== prev) _notifySelected();
});

// --- Utilities ---

/** Format seconds into MM:SS */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Extract a short player name from the bus name. */
export function getPlayerName(player: Mpris.Player): string {
  const bus = player.busName ?? "";
  const parts = bus.replace("org.mpris.MediaPlayer2.", "").split(".");
  return parts[0] || "unknown";
}

export { mpris, Mpris };