import { ContainerModule } from "inversify";
declare class AppContainer {
    private container;
    constructor();
    create(modules: ContainerModule[]): AppContainer;
}
export default AppContainer;
