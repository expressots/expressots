// Primary API - pure simplicity
export { micro, type MicroApp, type MicroConfig } from "./micro";

// Advanced features - import separately when needed
export * from "./gateway"; // CircuitBreaker, ServiceProxy
export * from "./service-mesh"; // ServiceDiscovery, ServiceClient
export * from "./serverless"; // Lambda, Cloudflare, Vercel adapters
export * from "./queue"; // RabbitMQ consumer

// Legacy API - deprecated, will be removed in v6
/** @deprecated Use micro() instead */
export { createMicroAPI, MicroAPIConfig } from "./application-express-micro";
