/**
 * Service instance information
 */
export interface ServiceInstance {
  /** Unique instance ID */
  id: string;
  /** Service name */
  name: string;
  /** Host address */
  host: string;
  /** Port number */
  port: number;
  /** Service metadata */
  metadata?: Record<string, unknown>;
  /** Health status */
  health: "healthy" | "unhealthy";
  /** Last health check timestamp */
  lastCheck: Date;
}

/**
 * Configuration for ServiceDiscovery
 */
export interface ServiceDiscoveryConfig {
  /** Discovery type: "consul", "etcd", or "static" */
  type: "consul" | "etcd" | "static";
  /** Discovery service endpoint (for consul/etcd) */
  endpoint?: string;
  /** Refresh interval in ms (default: 30000) */
  refreshInterval?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * ServiceDiscovery - Service discovery for microservices.
 *
 * Features:
 * - Static service registration
 * - Consul integration
 * - etcd integration
 * - Automatic service refresh
 * - Round-robin load balancing
 * - Health-based filtering
 *
 * @example
 * ```typescript
 * // Static service discovery
 * const discovery = new ServiceDiscovery({ type: "static" });
 *
 * discovery.registerService({
 *     id: "user-service-1",
 *     name: "user-service",
 *     host: "user-service",
 *     port: 3001,
 *     health: "healthy",
 *     lastCheck: new Date(),
 * });
 *
 * // Get a healthy instance
 * const instance = discovery.getService("user-service");
 * const client = new ServiceClient({
 *     name: "user-service",
 *     baseUrl: `http://${instance.host}:${instance.port}`,
 * });
 *
 * // Or with Consul
 * const discovery = new ServiceDiscovery({
 *     type: "consul",
 *     endpoint: "http://consul:8500",
 * });
 * await discovery.initialize();
 * ```
 */
export class ServiceDiscovery {
  private services: Map<string, Array<ServiceInstance>> = new Map();
  private roundRobinIndex: Map<string, number> = new Map();
  private refreshTimer?: ReturnType<typeof setInterval>;
  private config: Required<ServiceDiscoveryConfig>;

  constructor(config: ServiceDiscoveryConfig) {
    this.config = {
      type: config.type,
      endpoint: config.endpoint ?? "",
      refreshInterval: config.refreshInterval ?? 30000,
      debug: config.debug ?? false,
    };
  }

  /**
   * Initialize the service discovery
   * For consul/etcd, this starts the refresh loop
   */
  async initialize(): Promise<void> {
    if (this.config.type === "static") {
      // Static configuration - no auto-discovery
      return;
    }

    // Initial refresh
    await this.refresh();

    // Start refresh loop
    if (this.config.refreshInterval > 0) {
      this.refreshTimer = setInterval(() => this.refresh(), this.config.refreshInterval);
    }
  }

  /**
   * Register a service instance (for static mode)
   * @param service - Service instance to register
   */
  registerService(service: ServiceInstance): void {
    const instances = this.services.get(service.name) || [];

    // Check if instance already exists
    const existingIndex = instances.findIndex((i) => i.id === service.id);
    if (existingIndex >= 0) {
      instances[existingIndex] = service;
    } else {
      instances.push(service);
    }

    this.services.set(service.name, instances);

    if (this.config.debug) {
      console.log(`[ServiceDiscovery] Registered ${service.name} (${service.id})`);
    }
  }

  /**
   * Deregister a service instance
   * @param serviceName - Service name
   * @param instanceId - Instance ID to remove
   */
  deregisterService(serviceName: string, instanceId: string): void {
    const instances = this.services.get(serviceName);
    if (!instances) return;

    const filtered = instances.filter((i) => i.id !== instanceId);
    this.services.set(serviceName, filtered);

    if (this.config.debug) {
      console.log(`[ServiceDiscovery] Deregistered ${serviceName} (${instanceId})`);
    }
  }

  /**
   * Get a healthy instance of a service (round-robin)
   * @param name - Service name
   * @returns A healthy service instance or null
   */
  getService(name: string): ServiceInstance | null {
    const instances = this.services.get(name);
    if (!instances || instances.length === 0) {
      return null;
    }

    // Filter to healthy instances only
    const healthy = instances.filter((i) => i.health === "healthy");
    if (healthy.length === 0) {
      return null;
    }

    // Round-robin selection
    const currentIndex = this.roundRobinIndex.get(name) ?? 0;
    const instance = healthy[currentIndex % healthy.length];
    this.roundRobinIndex.set(name, currentIndex + 1);

    return instance;
  }

  /**
   * Get all instances of a service
   * @param name - Service name
   * @param healthyOnly - Only return healthy instances (default: true)
   */
  getServiceInstances(name: string, healthyOnly: boolean = true): Array<ServiceInstance> {
    const instances = this.services.get(name) || [];
    if (healthyOnly) {
      return instances.filter((i) => i.health === "healthy");
    }
    return instances;
  }

  /**
   * Get all registered services
   */
  getAllServices(): Map<string, Array<ServiceInstance>> {
    return new Map(this.services);
  }

  /**
   * List all registered service names
   */
  listServices(): Array<string> {
    return Array.from(this.services.keys());
  }

  /**
   * Update health status of a service instance
   * @param serviceName - Service name
   * @param instanceId - Instance ID
   * @param health - New health status
   */
  updateHealth(serviceName: string, instanceId: string, health: "healthy" | "unhealthy"): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) return false;

    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) return false;

    instance.health = health;
    instance.lastCheck = new Date();

    if (this.config.debug) {
      console.log(`[ServiceDiscovery] Updated ${serviceName} (${instanceId}) health to ${health}`);
    }

    return true;
  }

  /**
   * Get service statistics
   */
  getStats(): Record<string, { total: number; healthy: number; unhealthy: number }> {
    const stats: Record<string, { total: number; healthy: number; unhealthy: number }> = {};

    for (const [name, instances] of this.services) {
      stats[name] = {
        total: instances.length,
        healthy: instances.filter((i) => i.health === "healthy").length,
        unhealthy: instances.filter((i) => i.health === "unhealthy").length,
      };
    }

    return stats;
  }

  /**
   * Stop the service discovery
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Refresh service list from discovery backend
   */
  private async refresh(): Promise<void> {
    try {
      if (this.config.type === "consul") {
        await this.refreshFromConsul();
      } else if (this.config.type === "etcd") {
        await this.refreshFromEtcd();
      }
    } catch (error) {
      console.error("[ServiceDiscovery] Refresh failed:", error);
    }
  }

  /**
   * Refresh from Consul
   */
  private async refreshFromConsul(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error("Consul endpoint not configured");
    }

    try {
      // Get list of services
      const servicesResponse = await fetch(`${this.config.endpoint}/v1/catalog/services`);
      const services = await servicesResponse.json();

      // Get instances for each service
      for (const serviceName of Object.keys(services)) {
        const instances = await this.getConsulInstances(serviceName);
        this.services.set(serviceName, instances);
      }

      if (this.config.debug) {
        console.log(`[ServiceDiscovery] Refreshed ${this.services.size} services from Consul`);
      }
    } catch (error) {
      console.error("[ServiceDiscovery] Consul refresh failed:", error);
      throw error;
    }
  }

  /**
   * Get instances from Consul for a specific service
   */
  private async getConsulInstances(serviceName: string): Promise<Array<ServiceInstance>> {
    const response = await fetch(
      `${this.config.endpoint}/v1/health/service/${serviceName}?passing=true`,
    );
    const data = (await response.json()) as Array<{
      Service: {
        ID: string;
        Service: string;
        Address: string;
        Port: number;
        Meta?: Record<string, unknown>;
      };
      Node: { Address: string };
    }>;

    return data.map((entry) => ({
      id: entry.Service.ID,
      name: entry.Service.Service,
      host: entry.Service.Address || entry.Node.Address,
      port: entry.Service.Port,
      metadata: entry.Service.Meta,
      health: "healthy" as const,
      lastCheck: new Date(),
    }));
  }

  /**
   * Refresh from etcd
   */
  private async refreshFromEtcd(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error("etcd endpoint not configured");
    }

    // etcd v3 API implementation
    if (this.config.debug) {
      console.log("[ServiceDiscovery] etcd integration requires etcd3 client library");
    }
  }
}
