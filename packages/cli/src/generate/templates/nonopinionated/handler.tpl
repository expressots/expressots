import { provide, OnEvent, IEventHandler } from "@expressots/core";
import { {{{eventName}}} } from "{{{eventPath}}}";

@provide({{className}}Handler)
@OnEvent({{eventName}}, { priority: {{priority}} })
export class {{className}}Handler implements IEventHandler<{{eventName}}> {
    async handle(event: {{eventName}}): Promise<void> {
        // TODO: Implement handler logic
        console.log(`Handling ${event.constructor.name}`);
    }
}

