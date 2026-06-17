/**
 * Domain event emitted when a new user is created.
 *
 * Subscribers register with `@OnEvent(UserCreatedEvent)` in their handler
 * class (see `welcome-email.handler.ts` for a working example).
 *
 * Emit events through the injected `EventEmitter`:
 *
 *   await this.eventEmitter.emit(new UserCreatedEvent("u_123", "ada@example.com"));
 *
 * See https://expresso-ts.com/docs/features/events for the full reference.
 */
export class UserCreatedEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly createdAt: Date = new Date(),
    ) {}
}
