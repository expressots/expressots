import { stdout } from "process";
import { IConsoleMessage } from "@expressots/shared";
import { ColorStyle, bgColorCodes, colorCodes } from "./color-codes";

/**
 * Console class for displaying styled startup messages.
 *
 * @layer public
 * @audience application-developers
 * @concept console-output
 * @difficulty beginner
 *
 * @summary Quick Start
 * Used internally by the framework to display startup banners.
 * Typically you don't need to use this directly.
 *
 * @example
 * ```typescript
 * // Used internally by bootstrap()
 * const console = container.get(Console);
 * await console.messageServer(3000, "development", {
 *   appName: "My App",
 *   appVersion: "1.0.0"
 * });
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Console provides:
 * - ANSI color code support for terminal output
 * - Environment-based color coding (dev=yellow, prod=green, other=red)
 * - Startup banner formatting
 *
 * **Design Decisions**
 * - Uses ANSI escape codes for cross-platform compatibility
 * - Environment-based colors for quick visual feedback
 * - Async methods for consistency with framework patterns
 *
 * @see {@link ColorStyle} for available colors
 *
 * @public API
 */
export class Console {
  /**
   * Print a message to the console with the specified color style.
   *
   * @layer internal
   * @audience framework-developers
   *
   * @param message - The message to be printed.
   * @param colorStyle - The color style for the message.
   *
   * @internal
   */
  private async printColor(
    message: string,
    colorStyle: ColorStyle,
  ): Promise<void> {
    const textColor = "black";
    const bgColor = colorStyle;
    stdout.write(
      `${bgColorCodes[bgColor]}${colorCodes[textColor]}${message}\x1b[0m\n`,
    );
  }

  /**
   * Display a message in the console with details about the running server.
   *
   * @layer public
   * @audience application-developers
   *
   * @param port - The port number the server is running on.
   * @param environment - The server environment.
   * @param consoleMessage - Optional application message details for console output.
   *
   * **Color Coding:**
   * - `development` → Yellow background
   * - `production` → Green background
   * - Other → Red background
   *
   * @example
   * ```typescript
   * await console.messageServer(3000, "development", {
   *   appName: "My API",
   *   appVersion: "2.0.0"
   * });
   * // Output: [My API] version [2.0.0] is running on port [3000] - Environment: [development]
   * ```
   *
   * @public API
   */
  public async messageServer(
    port: number,
    environment: string,
    consoleMessage?: IConsoleMessage,
  ): Promise<void> {
    const appConsoleMessage: IConsoleMessage = {
      appName: consoleMessage?.appName || "App",
      appVersion: consoleMessage?.appVersion || "not provided",
    };

    let terminalColor: ColorStyle = ColorStyle.None;

    switch (environment.toLowerCase()) {
      case "development":
        terminalColor = ColorStyle.Yellow;
        break;
      case "production":
        terminalColor = ColorStyle.Green;
        break;
      default:
        terminalColor = ColorStyle.Red;
        break;
    }

    await this.printColor(
      `[${appConsoleMessage.appName}] version [${appConsoleMessage.appVersion}] is running on ` +
        `port [${port}] - Environment: [${environment}]`,
      terminalColor,
    );
  }
}
