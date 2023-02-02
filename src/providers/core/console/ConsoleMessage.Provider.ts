import chalk from "chalk";
import { Env } from "env";
import { provide } from "inversify-binding-decorators";

enum Color {
    NONE = 0,
    YELLOW,
    BLUE,
    GREEN,
    RED
}

interface IServerMessageToConsole {
    appName: string | undefined;
    appVersion: string | undefined;
    timezone: string | undefined;
    adminEmail: string | undefined;
    language: string | undefined;
    environment: string | undefined;
    port: string | undefined;
}

@provide(ConsoleMessageProvider)
class ConsoleMessageProvider {

    constructor() { }

    public async Log(message: string, template: Color): Promise<void> {

        switch (template) {
            case Color.YELLOW:
                return console.log(chalk.bgYellow.black(message));
            case Color.BLUE:
                return console.log(chalk.bgBlue.black(message));
            case Color.GREEN:
                return console.log(chalk.bgGreen.black(message));
            case Color.RED:
                return console.log(chalk.bgRed.black(message));
        }
    }

    public async MessageServer(port: any): Promise<void> {

        const consoleMessage: IServerMessageToConsole = {
            appName: Env.Server.APP_NAME,
            appVersion: Env.Server.APP_VERSION,
            timezone: Env.Server.TIMEZONE,
            adminEmail: Env.Server.ADMIN_EMAIL,
            language: Env.Server.DEFAULT_LANGUAGE,
            environment: Env.Server.ENVIRONMENT,
            port: port,
        };

        let terminalColor: Color = Color.NONE;

        switch (Env.Server.ENVIRONMENT) {
            case "Development":
                terminalColor = Color.YELLOW;
                break;
            case "Staging":
                terminalColor = Color.BLUE;
                break;
            case "Production":
                terminalColor = Color.GREEN;
                break;
            default:
                terminalColor = Color.RED;
                break;
        }

        let securePortCheck: string = (consoleMessage.port === Env.Server.DEFAULT_PORT) ? "Non-Secure HTTP" : "Secure HTTPS";

        this.Log(
            `${consoleMessage.appName} version ${consoleMessage.appVersion} is running on a ` +
            `${securePortCheck} port ${consoleMessage.port} - Environment: ${consoleMessage.environment}`,
            terminalColor
        );
    }
}

export { ConsoleMessageProvider };