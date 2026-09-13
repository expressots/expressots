/**
 * Stands in for `@expressots/studio-agent`, which a Worker project does not
 * install (the Cloudflare scaffold removes it; it is an optional peer of the
 * adapter). Inside the monorepo the package *is* installed as a
 * devDependency, so without this alias the bundler would follow the
 * adapter's lazy `import("@expressots/studio-agent")` and pull OpenTelemetry,
 * gRPC and socket.io into a measurement that is supposed to reflect what
 * users ship. Throwing on import mirrors the real consumer, where the
 * import rejects and the adapter's try/catch leaves Studio disabled.
 */
throw new Error("@expressots/studio-agent is not installed in Worker projects");
