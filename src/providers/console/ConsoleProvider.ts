import chalk from 'chalk';
import { provide } from 'inversify-binding-decorators';

export enum Color {
    NONE = 0,
    YELLOW,
    BLUE,
    GREEN,
    RED
}

@provide(ConsoleProvider)
class ConsoleProvider {

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
}

export { ConsoleProvider };