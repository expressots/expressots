import { provide, OnEvent, IEventHandler, Logger } from "@expressots/core";
import { UserCreatedEvent } from "@events/user-created.event";

@provide(WelcomeEmailHandler)
@OnEvent(UserCreatedEvent, { priority: 10 })
export class WelcomeEmailHandler implements IEventHandler<UserCreatedEvent> {
    private readonly logger = new Logger().withContext("WelcomeEmailHandler");

    /** Last handled event (useful for integration tests). */
    static lastHandled: UserCreatedEvent | null = null;

    async handle(event: UserCreatedEvent): Promise<void> {
        WelcomeEmailHandler.lastHandled = event;
        this.logger.info(`Sending welcome email to ${event.email} (user ${event.userId})`);
    }
}
