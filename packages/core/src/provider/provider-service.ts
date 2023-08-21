import { provideSingleton, provideTransient } from "../decorator";
import { EnvValidatorProvider } from "./environment/env-validator.provider";

interface IProvider {
    envValidator(): EnvValidatorProvider;
}

@provideSingleton(Provider)
class Provider implements IProvider {
    private envValidatorProvider: EnvValidatorProvider;
    
    constructor() {
        this.envValidatorProvider = new EnvValidatorProvider();
    }

    envValidator(): EnvValidatorProvider {
        return this.envValidatorProvider;
    }
}

export { Provider, IProvider };