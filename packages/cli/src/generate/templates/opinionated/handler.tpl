import { provide, OnEvent, IEventHandler } from "@expressots/core";
import { {{{eventName}}} } from "{{{eventPath}}}";

/**
 * Handler for {{eventName}}
 *
 * Features:
 * - Auto-discovered
 * - Priority: {{priority}}
 * - Full type safety
 */
@provide({{className}}Handler)
@OnEvent({{eventName}}, { priority: {{priority}} })
export class {{className}}Handler implements IEventHandler<{{eventName}}> {
    async handle(event: {{eventName}}): Promise<void> {
        console.log(`Handling ${event.constructor.name}`, {
            timestamp: event.timestamp,
        });

        // TODO: Implement handler logic
    }
}

