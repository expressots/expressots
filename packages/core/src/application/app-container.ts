import { Container, ContainerModule } from "inversify";
import { buildProviderModule, provide } from "inversify-binding-decorators";

/**
 * The AppContainer class provides a container for managing dependency injection.
 * @provide AppContainer
 */
@provide(AppContainer)
class AppContainer {

    private container: Container;

    /**
     * Constructs a new instance of the AppContainer class.
     */
    constructor() { }

    /**
     * Creates and configures a new dependency injection container.
     * @param modules - An array of ContainerModule instances to load into the container.
     * @returns The configured dependency injection container.
     */
    public create(modules: ContainerModule[]): Container {
        this.container = new Container();
        this.container.load(buildProviderModule(), ...modules);
        return this.container;
    }
}

export { AppContainer };