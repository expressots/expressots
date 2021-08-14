import { ConsoleHelper } from '@providers/console/Console.Helper';
import { provide } from 'inversify-binding-decorators';
import { IServerMessageToConsole } from '@providers/types/ServerTypes';
import { Env } from 'env';

@provide(ServerHelper)
export class ServerHelper {
    
    constructor(private consoleHelper: ConsoleHelper) { }

    public async logMessages(configuration: IServerMessageToConsole): Promise<void> {
        const {
            port,
            appName,
            timezone,
            adminEmail,
            language,
            environment
        } = configuration;

        let terminalColor: any;

        switch (Env.Server.MODE)
        {
            case "Development":
                terminalColor = "YELLOW";
                break;
            case "Production":
                terminalColor = "BLUE"
                break;
            default:
                terminalColor = "RED";
                break;
        }
        
        this.consoleHelper.log(
            `${appName} is running on port ${port} - Environment: ${environment}`,
            terminalColor
        );
    }

    public async sleep(ms: number): Promise<void> {
        return await new Promise<void>(resolve => setTimeout(resolve, ms));
    }
}