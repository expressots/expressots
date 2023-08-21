type Color = "red" | "green" | "yellow" | "blue" | "black" | "none";

const colorCodes: Record<Color, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  black: "\x1b[30m",
  none: "\x1b[0m",
};

const bgColorCodes: Record<Color, string> = {
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  black: "\x1b[40m",
  none: "\x1b[0m",
};

/**
 * Enum representing possible color styles for console output.
 */
enum ColorStyle {
    None = "none",
    Yellow = "yellow",
    Blue = "blue",
    Green = "green",
    Red = "red",
}

export { Color, ColorStyle, colorCodes, bgColorCodes };