import { provide, OnEvent, IEventHandler, Logger } from "@expressots/core";
import { UserCreatedEvent } from "@events/user-created.event";

/**
 * WelcomeEmailHandler — fires whenever a UserCreatedEvent is published.
 *
 * The handler is auto-discovered by `setupEventSystemForExpress` because:
 *  1. The class is `@provide(...)` registered.
 *  2. The handler method is annotated with `@OnEvent(UserCreatedEvent)`.
 *  3. The class implements `IEventHandler<UserCreatedEvent>`.
 *
 * Multiple handlers on the same event run in `priority` order (lower = earlier).
 * Use `@When(predicate)` for conditional execution and `@OnEvents(...)` for
 * the same handler to react to multiple event classes.
 *
 * See https://expresso-ts.com/docs/features/events for the full reference.
 */
@provide(WelcomeEmailHandler)
export class WelcomeEmailHandler implements IEventHandler<UserCreatedEvent> {
    private readonly logger = new Logger().withContext("WelcomeEmailHandler");

    @OnEvent(UserCreatedEvent, { priority: 10 })
    async handle(event: UserCreatedEvent): Promise<void> {
        this.logger.info(`Sending welcome email to ${event.email} (user ${event.userId})`);
        // Replace with your transactional email integration.
    }
}
