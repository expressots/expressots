import { ContainerModule } from "inversify";
declare class BaseModule {
    constructor();
    private static createSymbols;
    static createContainerModule(controllers: any[]): ContainerModule;
}
declare const CreateModule: typeof BaseModule.createContainerModule;
export { CreateModule };
