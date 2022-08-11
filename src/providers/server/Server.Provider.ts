import { ConsoleProvider, Color } from '@providers/console/Console.Provider';
import { provide } from 'inversify-binding-decorators';
import { Env } from 'Env';

interface IServerMessageToConsole {
    appName: string | undefined;
    appVersion: string | undefined;
    timezone: string | undefined;
    adminEmail: string | undefined;
    language: string | undefined;
    environment: string | undefined;
    port: string | undefined;
}

@provide(ServerProvider)
class ServerProvider {

    constructor(private consoleProvider: ConsoleProvider) { }

    public async Init(consoleMessage: IServerMessageToConsole): Promise<void> {
        const {
            appName,
            appVersion,
            timezone,
            adminEmail,
            language,
            environment,
            port
        } = consoleMessage;

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

        let securePortCheck: string = (port === Env.Server.DEFAULT_PORT) ? "Non-Secure HTTP" : "Secure HTTPS";

        this.consoleProvider.Log(
            `${appName} version ${appVersion} is running on a ${securePortCheck} port ${port} - Environment: ${environment}`,
            terminalColor
        );
    }

    public async Sleep(ms: number): Promise<void> {
        return await new Promise<void>(resolve => setTimeout(resolve, ms));
    }
}

export { ServerProvider, IServerMessageToConsole };