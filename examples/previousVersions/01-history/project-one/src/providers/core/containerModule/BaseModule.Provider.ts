import { ContainerModule } from "inversify";
import { provide } from "inversify-binding-decorators";

type ControllerType = Map<Symbol, new () => any>;

@provide(BaseModuleProvider)
class BaseModuleProvider {

    constructor() {
    }

    private static CreateSymbols(controllers: any[]): ControllerType {

        const symbols = new Map<Symbol, new () => any>();

        for (const controller of controllers) {
            const target = controller;
            const symbol = Symbol.for(target.name);
            symbols.set(symbol, target);
        }

        return symbols;
    }

    static CreateContainerModule(controllers: any[]): ContainerModule {

        const symbols = BaseModuleProvider.CreateSymbols(controllers);

        return new ContainerModule(bind => {
            for (const symbol of symbols) {
                const target = symbol.valueOf();

                bind(target[0]).to(target[1]);
            }
        });
    }
}

const CreateModule = BaseModuleProvider.CreateContainerModule;

export { CreateModule };