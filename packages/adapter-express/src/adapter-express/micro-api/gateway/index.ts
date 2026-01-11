/**
 * API Gateway Utilities for ExpressoTS Micro Template
 */

export {
    CircuitBreaker,
    type CircuitBreakerConfig,
    type CircuitBreakerStats,
    type CircuitState,
} from "./circuit-breaker";

export {
    ServiceProxy,
    createProxy,
    type ServiceProxyConfig,
} from "./service-proxy";
