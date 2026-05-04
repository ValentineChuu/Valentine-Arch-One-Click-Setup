/** Shared Hyprland client singleton — avoids repeated casts across modules. */
const Hyprland = (globalThis as any).imports.gi.AstalHyprland.get_default()
export default Hyprland
