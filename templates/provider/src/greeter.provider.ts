import { provide } from "@expressots/core";

export interface GreeterOptions {
    /** Prefix prepended to every greeting. Defaults to "Hello". */
    prefix?: string;
}

/**
 * Sample provider for the `@expressots/provider` template.
 *
 * Replace this with your real provider. The class is DI-friendly out of the box:
 *
 * ```ts
 * import { GreeterProvider } from "my-provider";
 *
 * @provide(MyService)
 * export class MyService {
 *   constructor(@inject(GreeterProvider) private readonly greeter: GreeterProvider) {}
 *
 *   hello() {
 *     return this.greeter.greet("ExpressoTS");
 *   }
 * }
 * ```
 */
@provide(GreeterProvider)
export class GreeterProvider {
    private readonly prefix: string;

    constructor(options: GreeterOptions = {}) {
        this.prefix = options.prefix ?? "Hello";
    }

    greet(name: string): string {
        return `${this.prefix}, ${name}!`;
    }
}
