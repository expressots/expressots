/**
 * Domain event emitted when a new user is created.
 *
 * See https://doc.expresso-ts.com/docs/features/events
 */
export class UserCreatedEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly createdAt: Date = new Date(),
    ) {}
}
