import chalk from 'chalk';
import { provide } from 'inversify-binding-decorators';

@provide(ConsoleHelper)
export class ConsoleHelper {

    constructor() {}

    public async log(message: string, template: "YELLOW" | "RED" | "BLUE" | "GREEN" = "YELLOW"): Promise<void> {
        
        switch (template) {
            case "GREEN":
                return console.log(chalk.bgGreen.black(message));
            case "BLUE":
                return console.log(chalk.bgBlue.black(message));
            case "RED":
                return console.log(chalk.bgRed.black(message));
            case "YELLOW":
                return console.log(chalk.bgYellow.black(message));
        }        
    }
}