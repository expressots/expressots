/**
 * Type representing supported text colors.
 */
type Color = "red" | "green" | "yellow" | "blue" | "white" | "black" | "none";

/**
 * Mapping of text color codes.
 *
 * @remarks
 * Defines the ANSI escape codes for the corresponding colors in the terminal.
 */
const colorCodes: Record<Color, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  black: "\x1b[30m",
  none: "\x1b[0m",
};

/**
 * ANSI escape color codes mapping for different background colors.
 */
const bgColorCodes: Record<Color, string> = {
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  white: "\x1b[47m",
  black: "\x1b[40m",
  none: "\x1b[0m",
};

/**
 * Enum representing possible color styles for console output.
 *
 * @remarks
 * Enum values correspond to the string representations of colors.
 */
enum ColorStyle {
  None = "none",
  Yellow = "yellow",
  Blue = "blue",
  Green = "green",
  Red = "red",
}

export { Color, ColorStyle, colorCodes, bgColorCodes };
