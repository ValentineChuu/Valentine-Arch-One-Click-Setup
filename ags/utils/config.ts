import GLib from "gi://GLib";

const CONFIG_PATH = `${GLib.get_user_config_dir()}/ags/config.json`;

// ── Theme presets ───────────────────────────────────────────────────

type CSSColor = [number, number, number] | [number, number, number, number];

interface ThemeColors {
  bg: CSSColor;
  bgAlt: CSSColor;
  fg: CSSColor;
  accent: CSSColor;
  accentAlt: CSSColor;
  text: CSSColor;
  border: CSSColor;
}

const themes: Record<string, ThemeColors> = {
  "nord-dark": {
    bg: [46, 52, 64], bgAlt: [59, 66, 82], fg: [67, 76, 94],
    accent: [136, 192, 208], accentAlt: [129, 161, 193],
    text: [236, 239, 244], border: [76, 86, 106],
  },
  "nord-light": {
    bg: [236, 239, 244], bgAlt: [229, 233, 240], fg: [216, 222, 233],
    accent: [94, 129, 172], accentAlt: [76, 114, 160],
    text: [46, 52, 64], border: [216, 222, 233],
  },
  "dracula": {
    bg: [40, 42, 54], bgAlt: [68, 71, 90], fg: [98, 114, 164],
    accent: [189, 147, 249], accentAlt: [255, 121, 198],
    text: [248, 248, 242], border: [68, 71, 90],
  },
  "gruvbox-dark": {
    bg: [40, 40, 40], bgAlt: [60, 56, 54], fg: [80, 73, 69],
    accent: [215, 153, 33], accentAlt: [250, 189, 47],
    text: [235, 219, 178], border: [80, 73, 69],
  },
  "gruvbox-light": {
    bg: [251, 241, 199], bgAlt: [235, 219, 178], fg: [213, 196, 161],
    accent: [215, 153, 33], accentAlt: [184, 134, 11],
    text: [60, 56, 54], border: [213, 196, 161],
  },
  "catppuccin-latte": {
    bg: [239, 241, 245], bgAlt: [230, 233, 239], fg: [220, 224, 232],
    accent: [136, 57, 239], accentAlt: [30, 102, 245],
    text: [76, 79, 105], border: [220, 224, 232],
  },
  "catppuccin-frappe": {
    bg: [48, 52, 70], bgAlt: [65, 69, 89], fg: [81, 87, 109],
    accent: [202, 158, 230], accentAlt: [140, 170, 238],
    text: [198, 208, 245], border: [81, 87, 109],
  },
  "catppuccin-macchiato": {
    bg: [36, 39, 58], bgAlt: [54, 58, 79], fg: [73, 77, 100],
    accent: [198, 160, 246], accentAlt: [138, 173, 244],
    text: [202, 211, 245], border: [73, 77, 100],
  },
  "catppuccin-mocha": {
    bg: [30, 30, 46], bgAlt: [49, 50, 68], fg: [69, 71, 90],
    accent: [203, 166, 247], accentAlt: [137, 180, 250],
    text: [205, 214, 244], border: [69, 71, 90],
  },
  "solarized-light": {
    bg: [253, 246, 227], bgAlt: [238, 232, 213], fg: [220, 50, 47],
    accent: [38, 139, 210], accentAlt: [42, 161, 152],
    text: [101, 123, 131], border: [238, 232, 213],
  },
  "solarized-dark": {
    bg: [0, 43, 54], bgAlt: [7, 54, 66], fg: [88, 110, 117],
    accent: [38, 139, 210], accentAlt: [42, 161, 152],
    text: [131, 148, 150], border: [88, 110, 117],
  },
  "tokyo-night": {
    bg: [26, 27, 38], bgAlt: [36, 40, 59], fg: [65, 72, 104],
    accent: [122, 162, 247], accentAlt: [187, 154, 247],
    text: [192, 202, 245], border: [65, 72, 104],
  },
  "tokyo-night-storm": {
    bg: [36, 40, 59], bgAlt: [54, 58, 79], fg: [73, 77, 100],
    accent: [122, 162, 247], accentAlt: [187, 154, 247],
    text: [192, 202, 245], border: [73, 77, 100],
  },
  "tokyo-night-day": {
    bg: [224, 227, 234], bgAlt: [210, 214, 222], fg: [192, 197, 206],
    accent: [52, 84, 138], accentAlt: [90, 74, 173],
    text: [55, 65, 81], border: [192, 197, 206],
  },
  "everforest-dark": {
    bg: [45, 53, 59], bgAlt: [60, 68, 74], fg: [83, 92, 99],
    accent: [167, 192, 128], accentAlt: [127, 187, 179],
    text: [211, 198, 170], border: [83, 92, 99],
  },
  "everforest-light": {
    bg: [249, 245, 215], bgAlt: [239, 235, 206], fg: [220, 215, 186],
    accent: [143, 161, 121], accentAlt: [122, 168, 159],
    text: [92, 106, 114], border: [220, 215, 186],
  },
};

// ── Defaults ────────────────────────────────────────────────────────

const cavaDefaults = {
  channelMode: "stereo",
  visualizer: "wave",
  bars: 8,
  layerColors: false,
  colors: ["--accent", 0.15] as any,
  layers: [
    { name: "bass", lowCutoff: 20, highCutoff: 300, color: "--fg" as any },
    { name: "mid", lowCutoff: 300, highCutoff: 2000, color: "--accent" as any },
    { name: "treble", lowCutoff: 2000, highCutoff: 10000, color: "--accentAlt" as any },
  ],
};

const defaults = {
  theme: "nord-dark" as string,
  workspace: {
    allocation: 5,
  },
  clock: {
    military_time: false,
  },
  hardware: {
    wave_monitor: true,
  },
  cava: {
    shared_cava: true,
    ...cavaDefaults,
    media_cava: { ...cavaDefaults },
  },
  blur: {
    type: "gaussian",
    strength: 3,
    opacity: 0.5,
    angle: 0,
    rotation: 10,
  },
};

// ── Internal helpers ────────────────────────────────────────────────

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function resolveCSS(configs: any): Record<string, any> {
  const themeName = configs.theme || "nord-dark";
  const base = themes[themeName] || themes["nord-dark"];
  const explicit = configs.css;

  if (explicit && typeof explicit === "object") {
    return { ...base, ...explicit };
  }
  return { ...base };
}

function resolveCavaColor(color: any, themeDict: Record<string, any>): [number, number, number, number] {
  if (!Array.isArray(color) || color.length === 0) {
    return [255, 255, 255, 1];
  }

  if (typeof color[0] === "string") {
    const varName = (color[0] as string).replace(/^--/, "");
    const rgb = themeDict[varName];
    if (Array.isArray(rgb) && rgb.length >= 3 && typeof rgb[0] === "number") {
      const a = color.length >= 2 && typeof color[1] === "number" ? color[1] : 1;
      return [rgb[0], rgb[1], rgb[2], a];
    }
    print(`config: cava color "--${varName}" not found in theme`);
    const a = color.length >= 2 && typeof color[1] === "number" ? color[1] : 1;
    return [255, 255, 255, a];
  }

  if (typeof color[0] === "number") {
    const r = color[0];
    const g = color[1] ?? 255;
    const b = color[2] ?? 255;
    const a = color.length >= 4 ? color[3] : 1;
    return [r, g, b, a];
  }

  return [255, 255, 255, 1];
}

function resolveCavaSection(section: any, themeDict: Record<string, any>) {
  if (!section) return;

  if (section.colors) {
    section.colors = resolveCavaColor(section.colors, themeDict);
  }

  if (Array.isArray(section.layers)) {
    for (const layer of section.layers) {
      if (layer.color !== undefined) {
        layer.color = resolveCavaColor(layer.color, themeDict);
      }
    }
  }
}

// ── Load, merge, resolve ────────────────────────────────────────────

function load() {
  try {
    const [ok, contents] = GLib.file_get_contents(CONFIG_PATH);
    if (ok && contents) {
      const json = JSON.parse(new TextDecoder().decode(contents));
      return deepMerge(defaults, json);
    }
  } catch (e) {
    print(`config: ${e}`);
  }
  return { ...defaults };
}

const Configs = load();
const resolvedCSS = resolveCSS(Configs);

// resolve colors for main cava section and nested media_cava
resolveCavaSection(Configs.cava, resolvedCSS);
resolveCavaSection(Configs.cava.media_cava, resolvedCSS);

// ── Exports ─────────────────────────────────────────────────────────

export default Configs;
export { themes };

export function configCSS(): string {
  const styleDir = `${GLib.get_user_config_dir()}/ags/style`;

  let allCSS = "";

  try {
    const dir = GLib.Dir.open(styleDir, 0);
    let name: string | null;
    while ((name = dir.read_name()) !== null) {
      if (name.endsWith(".css")) {
        const [ok, bytes] = GLib.file_get_contents(`${styleDir}/${name}`);
        if (ok && bytes) allCSS += new TextDecoder().decode(bytes) + "\n";
      }
    }
  } catch (e) {
    print(`configCSS: failed to read style dir: ${e}`);
  }

  const lines: string[] = ["* {"];
  for (const [key, value] of Object.entries(resolvedCSS)) {
    if (
      Array.isArray(value) &&
      (value.length === 3 || value.length === 4) &&
      typeof value[0] === "number"
    ) {
      const a = value.length === 4 ? (value[3] as number) : 1;
      lines.push(`  --${key}: rgba(${value[0]}, ${value[1]}, ${value[2]}, ${a});`);
    } else if (typeof value === "string") {
      lines.push(`  --${key}: ${value};`);
    } else if (typeof value === "number") {
      lines.push(`  --${key}: ${value};`);
    }
  }
  lines.push("}");

  return lines.join("\n") + "\n" + allCSS;
}