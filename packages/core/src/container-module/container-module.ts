import { ContainerModule } from "inversify";
import { provide } from "inversify-binding-decorators";

/**
 * Type alias for a map of controller symbols to controller constructor functions.
 */
type controllerType = Map<Symbol, new () => any>;

/**
 * The BaseModule class provides methods for creating InversifyJS container modules.
 * @provide BaseModule
 */
@provide(BaseModule)
class BaseModule {

    constructor() { }

    /**
     * Create a map of symbols for the provided controllers.
     * @param controllers - An array of controller classes.
     * @returns A map of symbols mapped to controller constructor functions.
     */
    private static createSymbols(controllers: any[]): controllerType {

        const symbols = new Map<Symbol, new () => any>();

        for (const controller of controllers) {
            const target = controller;
            const symbol = Symbol.for(target.name);
            symbols.set(symbol, target);
        }

        return symbols;
    }

     /**
     * Create an InversifyJS ContainerModule for the provided controllers.
     * @param controllers - An array of controller classes.
     * @returns A ContainerModule with the controller bindings.
     */
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