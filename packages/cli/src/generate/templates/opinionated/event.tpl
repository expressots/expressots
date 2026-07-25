/**
 * {{className}} Event
 *
 * Type-safe event - no strings!
 *
 * Usage:
 * await this.eventEmitter.emit(new {{className}}Event(data));
 */
export class {{className}}Event {
    constructor(
        public readonly data: Record<string, unknown>,
        public readonly timestamp: Date = new Date(),
    ) {}
}

