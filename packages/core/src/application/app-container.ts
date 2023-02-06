import { Container, ContainerModule } from "inversify";
import { buildProviderModule, provide } from "inversify-binding-decorators";

@provide(AppContainer)
class AppContainer {

    private container: Container;

    constructor() { }

    public create(modules: ContainerModule[]): Container {
        this.container = new Container();
        this.container.load(buildProviderModule(), ...modules);
        return this.container;
    }
}

export { AppContainer };