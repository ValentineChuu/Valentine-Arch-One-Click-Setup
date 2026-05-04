import GLib from "gi://GLib";

export type BlurType =
  | "gaussian"
  | "box"
  | "motion"
  | "radial"
  | "adaptive"
  | "lens";

export interface BlurOptions {
  /** Blur algorithm to use. Default: "gaussian" */
  type?: BlurType;
  /** Blur strength (sigma for gaussian/adaptive/box, radius for lens). Default: 15 */
  strength?: number;
  /** Angle in degrees for motion blur. Default: 0 */
  angle?: number;
  /** Degrees of rotation for radial blur. Default: 10 */
  rotation?: number;
  /** Opacity of the blurred image (0.0 - 1.0). Default: 1.0 */
  opacity?: number;
}

let counter = 0;

/**
 * Blur an image file using ImageMagick's `convert` command.
 * Returns the path to the blurred temporary PNG file.
 *
 * @param inputPath  Path to the source image
 * @param opts       Blur options
 * @returns          Path to the blurred image, or null on failure
 */
export function blurImage(
  inputPath: string,
  opts: BlurOptions = {}
): string | null {
  const {
    type = "gaussian",
    strength = 15,
    angle = 0,
    rotation = 10,
  } = opts;

  const outPath = `/tmp/_ags_blur_${counter++}.png`;

  let args: string[];

  switch (type) {
    case "gaussian":
      args = ["-blur", `0x${strength}`];
      break;
    case "box":
      // Box blur via resize down then up (fast, smooth)
      args = [
        "-scale", `${Math.max(1, Math.round(100 / strength))}%`,
        "-scale", "1000%",
        "-blur", `0x${Math.max(1, Math.round(strength / 3))}`,
      ];
      break;
    case "motion":
      args = ["-motion-blur", `0x${strength}+${angle}`];
      break;
    case "radial":
      args = ["-rotational-blur", `${rotation}`];
      break;
    case "adaptive":
      args = ["-adaptive-blur", `0x${strength}`];
      break;
    case "lens":
      args = [
        "-morphology", "Convolve", `Disk:${Math.max(1, Math.round(strength / 3))}`,
      ];
      break;
    default:
      args = ["-blur", `0x${strength}`];
  }

  const cmd = ["magick", inputPath, ...args, outPath];

  try {
    const [ok, _stdout, stderr, exitStatus] = GLib.spawn_command_line_sync(
      cmd.join(" ")
    );

    if (!ok || exitStatus !== 0) {
      const err = stderr
        ? new TextDecoder().decode(stderr)
        : "unknown error";
      print("blur error: " + err);
      return null;
    }

    return outPath;
  } catch (e) {
    print("blur spawn error: " + e);
    return null;
  }
}