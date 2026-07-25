import { CreateModule, ContainerModule } from "@expressots/core";
import { {{className}}Controller } from "{{{path}}}";

export const {{moduleName}}Module: ContainerModule = CreateModule([{{className}}Controller]);
