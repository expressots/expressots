import { CreateModule } from "@expressots/core";
import { {{className}}Controller } from "./{{{path}}}";

const {{moduleName}}Module = CreateModule([{{className}}Controller]);

export { {{moduleName}}Module };
