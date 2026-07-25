// Primary API - pure simplicity
export { micro, type MicroApp, type MicroConfig } from "./micro.js";

// Advanced features - import separately when needed
export * from "./gateway/index.js"; // CircuitBreaker, ServiceProxy
export * from "./service-mesh/index.js"; // ServiceDiscovery, ServiceClient
export * from "./serverless/index.js"; // Lambda, Cloudflare, Vercel adapters
export * from "./queue/index.js"; // RabbitMQ consumer

// Legacy API - deprecated, will be removed in v6
/** @deprecated Use micro() instead */
export { createMicroAPI, MicroAPIConfig } from "./application-express-micro.js";
