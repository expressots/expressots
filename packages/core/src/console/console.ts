import chalk from "chalk";
import { provide } from "inversify-binding-decorators";
import { IEnv } from "../application";

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
    timezone: string,
    adminEmail: string;
    language: string;
    environment: string;
    https: boolean;
    port: string;
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

    public async messageServer(port: any, env?: IEnv): Promise<void> {

        const appConsoleMessage: IApplicationMessageToConsole = {
            appName: env.Application.APP_NAME || "Expressots",
            appVersion: env.Application.APP_VERSION || "1.0.0",
            timezone: env.Application.TIMEZONE || "UTC",
            adminEmail: env.Application.ADMIN_EMAIL || "dev@expresso-ts.com",
            language: env.Application.LANGUAGE || "en",
            environment: env.Application.ENVIRONMENT || "development",
            https: env.Application.HTTPS || false,
            port: port
        };

        let terminalColor: ColorStyle = ColorStyle.None;

        switch (env.Application.ENVIRONMENT.toLowerCase()) {
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

        let securePortCheck: string = env.Application.HTTPS ? "Secure HTTPS" : "Non-Secure HTTP";

        this.printColor(
            `${appConsoleMessage.appName} version ${appConsoleMessage.appVersion} is running on a ` +
            `${securePortCheck} port ${appConsoleMessage.port} - Environment: ${appConsoleMessage.environment}`,
            terminalColor
        )
    }
}

export { Console };