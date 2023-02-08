import chalk from "chalk";
import { provide } from "inversify-binding-decorators";

enum ColorStyle {
    None = 0,
    Yellow,
    Blue,
    Green,
    Red
}

interface IApplicationMessageToConsole {
    appName: string;
    appVersion: string;
}

@provide(Console)
class Console {

    private async printColor(message: string, colorStyle: ColorStyle): Promise<void> {

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

    public async messageServer(port: any, environment: string, consoleMessage?: IApplicationMessageToConsole): Promise<void> {

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
            terminalColor
        )
    }
}

export { Console, IApplicationMessageToConsole };
