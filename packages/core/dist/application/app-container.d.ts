import { Container, ContainerModule } from "inversify";
declare class AppContainer {
    private container;
    constructor();
    create(modules: ContainerModule[]): Container;
}
export { AppContainer };
