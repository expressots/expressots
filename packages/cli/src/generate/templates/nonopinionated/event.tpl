/**
 * {{className}} Event
 */
export class {{className}}Event {
    constructor(
        public readonly data: Record<string, unknown>,
        public readonly timestamp: Date = new Date(),
    ) {}
}

