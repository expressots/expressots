import { ContainerModule } from "inversify";
import { provide } from "inversify-binding-decorators";

type controllerType = Map<Symbol, new () => any>;

@provide(BaseModule)
class BaseModule {

    constructor() { }

    private static createSymbols(controllers: any[]): controllerType {

        const symbols = new Map<Symbol, new () => any>();

        for (const controller of controllers) {
            const target = controller;
            const symbol = Symbol.for(target.name);
            symbols.set(symbol, target);
        }

        return symbols;
    }

    public static createContainerModule(controllers: any[]): ContainerModule {

        const symbols = BaseModule.createSymbols(controllers);

        return new ContainerModule(bind => {
            for (const symbol of symbols) {
                const target: Object = symbol.valueOf();

                bind(target[0]).to(target[1]);
            }
        });
    }
}

const CreateModule = BaseModule.createContainerModule;

export { CreateModule };