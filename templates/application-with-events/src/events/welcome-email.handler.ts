import { provide, OnEvent, IEventHandler, Logger } from "@expressots/core";
import { UserCreatedEvent } from "@events/user-created.event";

/**
 * WelcomeEmailHandler — fires whenever a UserCreatedEvent is published.
 *
 * The handler is auto-discovered by `setupEventSystemForExpress` because:
 *  1. The class is `@provide(...)` registered in the DI container.
 *  2. The class is annotated with `@OnEvent(UserCreatedEvent)`.
 *  3. It implements `IEventHandler<UserCreatedEvent>` and exposes a
 *     `handle(event)` method that is invoked on each emission.
 *
 * Multiple handlers on the same event run in `priority` order (lower = earlier).
 * Use `@When(predicate)` for conditional execution and `@OnEvents(...)` to
 * react to multiple event classes from the same handler.
 *
 * See https://expresso-ts.com/docs/features/events for the full reference.
 */
@provide(WelcomeEmailHandler)
@OnEvent(UserCreatedEvent, { priority: 10 })
export class WelcomeEmailHandler implements IEventHandler<UserCreatedEvent> {
    private readonly logger = new Logger().withContext("WelcomeEmailHandler");

    async handle(event: UserCreatedEvent): Promise<void> {
        this.logger.info(`Sending welcome email to ${event.email} (user ${event.userId})`);
        // Replace with your transactional email integration.
    }
}
