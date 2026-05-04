// @ts-ignore
import Mpris from "gi://AstalMpris";
import GLib from "gi://GLib";
import { getCachedArt } from "./artCache";

const TITLE_CHANGE_DELAY_MS = 300;

/**
 * Watch for track changes and manage the art transition.
 * Waits briefly after a title change for new cover art to arrive,
 * so art-to-art transitions don't flash the fallback.
 *
 * If the new title has cached art, calls onCachedArt instead of onClear.
 *
 * Returns a function to cancel the pending clear — call it when new
 * art successfully loads.
 */
export function onTrackChange(
  player: Mpris.Player,
  onClear: () => void,
  onCachedArt: (path: string) => void,
): () => void {
  let lastTitle = player.title ?? "";
  let pendingTimeout: number | null = null;

  function cancelClear() {
    if (pendingTimeout !== null) {
      GLib.source_remove(pendingTimeout);
      pendingTimeout = null;
    }
  }

  player.connect("notify::title", () => {
    const title = player.title ?? "";
    if (title === lastTitle) return;
    lastTitle = title;

    cancelClear();

    pendingTimeout = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      TITLE_CHANGE_DELAY_MS,
      () => {
        pendingTimeout = null;

        const cached = getCachedArt(title);
        if (cached) {
          onCachedArt(cached);
        } else {
          onClear();
        }

        return GLib.SOURCE_REMOVE;
      },
    );
  });

  return cancelClear;
}