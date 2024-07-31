import { ContainerModule } from "inversify";
import { CreateModule } from "@expressots/core";
import { {{className}}Controller } from "{{{path}}}";

export const {{moduleName}}Module: ContainerModule = CreateModule([{{className}}Controller]);
