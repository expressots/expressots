import chalk from "chalk";
import { provide } from "inversify-binding-decorators";

/**
 * Enum representing possible color styles for console output.
 */
enum ColorStyle {
  None = 0,
  Yellow,
  Blue,
  Green,
  Red,
}

/**
 * Interface representing application message details for console output.
 */
interface IApplicationMessageToConsole {
  appName: string;
  appVersion: string;
}

/**
 * The Console class provides methods for displaying styled messages in the console.
 * @provide Console
 */
@provide(Console)
class Console {
  /**
   * Print a message to the console with the specified color style.
   * @param message - The message to be printed.
   * @param colorStyle - The color style for the message.
   */
  private async printColor(
    message: string,
    colorStyle: ColorStyle,
  ): Promise<void> {
    switch (colorStyle) {
      case ColorStyle.Yellow:
        return console.log(chalk.bgYellow.black(message));
      case ColorStyle.Blue:
        return console.log(chalk.bgBlue.black(message));
      case ColorStyle.Green:
        return console.log(chalk.bgGreen.black(message));
      case ColorStyle.Red:
        return console.log(chalk.bgRed.black(message));
    }
  }

  /**
   * Display a message in the console with details about the running server.
   * @param port - The port number the server is running on.
   * @param environment - The server environment.
   * @param consoleMessage - Optional application message details for console output.
   */
  public async messageServer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    port: any,
    environment: string,
    consoleMessage?: IApplicationMessageToConsole,
  ): Promise<void> {
    const appConsoleMessage: IApplicationMessageToConsole = {
      appName: consoleMessage?.appName || "Application",
      appVersion: consoleMessage?.appVersion || "not provided",
    };

    let terminalColor: ColorStyle = ColorStyle.None;

    switch (environment.toLowerCase()) {
      case "development":
        terminalColor = ColorStyle.Yellow;
        break;
      case "staging":
        terminalColor = ColorStyle.Blue;
        break;
      case "production":
        terminalColor = ColorStyle.Green;
        break;
      default:
        terminalColor = ColorStyle.Red;
        break;
    }

    this.printColor(
      `${appConsoleMessage.appName} version ${appConsoleMessage.appVersion} is running on ` +
        `port ${port} - Environment: ${environment}`,
      terminalColor,
    );
  }
}

export { Console, IApplicationMessageToConsole };
