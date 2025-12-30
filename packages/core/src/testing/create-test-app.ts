/**
 * Zero-Config Test Application Setup
 *
 * @module testing
 *
 * Creates a fully functional test application with DI container,
 * fluent request builder, and automatic cleanup.
 *
 * @example
 * ```typescript
 * describe("UserController", () => {
 *   const { app, container, request } = await createTestApp(App);
 *
 *   test("GET /users returns user list", async () => {
 *     const response = await request.get("/users");
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */

import { Container } from "../di/inversify";
import { AppFactory } from "../application/application-factory";
import {
  IWebServer,
  IWebServerBuilder,
  IWebServerConstructor,
} from "@expressots/shared";
import {
  CreateTestAppOptions,
  TestAppResult,
  ITestApp,
  ServiceIdentifier,
  MockProviderConfig,
} from "./testing.interfaces";
import { createFluentRequest } from "./fluent-request";
import { Logger } from "../provider/logger/logger.provider";

/**
 * HTTP Server interface for cleanup.
 */
interface HTTPServer {
  address: () => { port: number } | null;
  close: (callback?: (err?: Error) => void) => void;
  closeIdleConnections?: () => void;
  destroy?: () => void;
}

/**
 * Internal test app wrapper that implements ITestApp interface.
 */
class TestApp implements ITestApp {
  private server: unknown;
  private _container: Container;
  private overrides: Map<ServiceIdentifier, unknown> = new Map();
  private logger?: Logger;

  constructor(
    private appInstance: IWebServerBuilder,
    container: Container,
  ) {
    this._container = container;
  }

  /**
   * Get the underlying HTTP server.
   */
  getHttpServer(): unknown {
    return this.server;
  }

  /**
   * Set the HTTP server reference.
   */
  setHttpServer(server: unknown): void {
    this.server = server;
  }

  /**
   * Close the test server.
   * Handles cleanup of both the app instance and the underlying HTTP server.
   */
  async close(): Promise<void> {
    // First, try to close via app instance if it has close method
    const app = this.appInstance as IWebServerBuilder & {
      close?: () => Promise<void>;
      getHttpServer?: () => Promise<HTTPServer>;
    };
    if (app && typeof app.close === "function") {
      await app.close();
      return;
    }

    // Get the HTTP server from the app instance if available
    let httpServer: HTTPServer | null = null;
    if (app && typeof app.getHttpServer === "function") {
      try {
        httpServer = (await app.getHttpServer()) as HTTPServer;
      } catch {
        // Server might not be initialized, try fallback
      }
    }

    // Fallback: use stored server reference
    if (!httpServer && this.server) {
      httpServer = this.server as HTTPServer;
    }

    // Close the HTTP server
    if (httpServer && typeof httpServer.close === "function") {
      // Close idle connections first for faster cleanup (like AppExpress does internally)
      if (typeof httpServer.closeIdleConnections === "function") {
        httpServer.closeIdleConnections();
      }

      // Close the server with proper error handling
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force destroy if close takes too long
          if (httpServer && typeof httpServer.destroy === "function") {
            httpServer.destroy();
          }
          resolve();
        }, 5000); // 5 second timeout

        httpServer!.close((err) => {
          clearTimeout(timeout);
          if (err) {
            // Don't fail on close error - just log and resolve
            // This matches AppExpress graceful shutdown behavior
            console.log(`Note: Test server close returned: ${err?.message}`);
          }
          resolve();
        });
      });
    }
  }

  /**
   * Get a service from the container.
   */
  get<T>(serviceIdentifier: ServiceIdentifier<T>): T {
    // Check for overrides first
    if (this.overrides.has(serviceIdentifier)) {
      return this.overrides.get(serviceIdentifier) as T;
    }
    return this._container.get<T>(serviceIdentifier as symbol | string);
  }

  /**
   * Check if a service is bound in the container.
   */
  isBound<T>(serviceIdentifier: ServiceIdentifier<T>): boolean {
    return this._container.isBound(serviceIdentifier as symbol | string);
  }

  /**
   * Override a provider with a mock.
   */
  overrideProvider<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    mock: Partial<T>,
  ): void {
    this.overrides.set(serviceIdentifier, mock);

    // Rebind in container if already bound
    const id = serviceIdentifier as symbol | string;
    if (this._container.isBound(id)) {
      this._container.rebind(id).toConstantValue(mock as T);
    } else {
      this._container.bind(id).toConstantValue(mock as T);
    }
  }

  /**
   * Get the DI container.
   */
  get container(): Container {
    return this._container;
  }

  /**
   * Get the app instance.
   */
  getAppInstance(): IWebServerBuilder {
    return this.appInstance;
  }
}

/**
 * Internal state for managing test apps.
 */
const activeTestApps: Array<TestApp> = [];

/**
 * Create a fully functional test application with zero configuration.
 *
 * @layer public
 * @audience application-developers
 * @concept testing
 *
 * This function provides:
 * - One-line test app creation
 * - Full DI container access
 * - Fluent HTTP request builder
 * - Automatic cleanup
 *
 * @param AppClass - The application class to test
 * @param options - Optional configuration
 * @returns Test app result with app, container, and request builder
 *
 * @example
 * ```typescript
 * // Simplest usage - zero config
 * const { app, container, request } = await createTestApp(App);
 *
 * // With mock providers
 * const { app, request } = await createTestApp(App, {
 *   mockProviders: [
 *     { provide: UserService, useValue: mockUserService }
 *   ]
 * });
 *
 * // With custom environment
 * const { app, request } = await createTestApp(App, {
 *   env: {
 *     DATABASE_URL: "memory://test",
 *     JWT_SECRET: "test-secret"
 *   }
 * });
 * ```
 */
export async function createTestApp<T extends IWebServer>(
  AppClass: IWebServerConstructor<T>,
  options: CreateTestAppOptions = {},
): Promise<TestAppResult> {
  // Set up test environment variables
  const originalEnv = { ...process.env };
  if (options.env) {
    Object.assign(process.env, options.env);
  }
  process.env.NODE_ENV = "test";

  try {
    // Create the app instance using AppFactory
    const appInstance = await AppFactory.create(AppClass);

    // Get the container from the app
    // Note: AppExpress stores container in private property
    type AppWithContainer = IWebServerBuilder & {
      container?: { Container?: Container };
      _container?: Container;
    };
    const appWithContainer = appInstance as AppWithContainer;
    const container =
      appWithContainer.container?.Container ||
      appWithContainer._container ||
      getContainerFromApp(appInstance);

    // Create test app wrapper
    const testApp = new TestApp(appInstance, container);

    // Apply mock providers
    if (options.mockProviders && options.mockProviders.length > 0) {
      applyMockProviders(testApp, options.mockProviders);
    }

    // Start the server on a random port
    const port = options.port ?? 0;
    await appInstance.listen(port, {
      appName: "Test App",
      appVersion: "1.0.0",
    });

    // Get the HTTP server instance (AppExpress has getHttpServer method)
    type AppWithHttpServer = IWebServerBuilder & {
      getHttpServer?: () => Promise<HTTPServer>;
    };
    const appWithServer = appInstance as AppWithHttpServer;

    let httpServer: HTTPServer | null = null;
    let actualPort = port;

    if (typeof appWithServer.getHttpServer === "function") {
      try {
        httpServer = (await appWithServer.getHttpServer()) as HTTPServer;
        // Get the actual port from the server
        const address = httpServer.address();
        if (
          address &&
          typeof address === "object" &&
          address !== null &&
          "port" in address
        ) {
          actualPort = (address as { port: number }).port;
        }
      } catch (error) {
        // If getHttpServer fails, try to get port from app instance
        const appWithPort = appInstance as IWebServerBuilder & {
          port?: number;
        };
        if (appWithPort.port !== undefined) {
          actualPort = appWithPort.port;
        }
      }
    } else {
      // Fallback: try to get port from app instance directly
      const appWithPort = appInstance as IWebServerBuilder & {
        port?: number;
      };
      if (appWithPort.port !== undefined) {
        actualPort = appWithPort.port;
      }
    }

    // Store HTTP server reference for cleanup
    if (httpServer) {
      testApp.setHttpServer(httpServer);
    }

    // Track active test apps for cleanup
    activeTestApps.push(testApp);

    const baseUrl = `http://localhost:${actualPort}`;

    // Create cleanup function
    const cleanup = async (): Promise<void> => {
      // Restore environment
      Object.keys(options.env || {}).forEach((key) => {
        if (originalEnv[key] !== undefined) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });

      // Close the app
      await testApp.close();

      // Remove from active apps
      const index = activeTestApps.indexOf(testApp);
      if (index > -1) {
        activeTestApps.splice(index, 1);
      }
    };

    // Set up auto-cleanup if enabled
    if (options.autoCleanup !== false) {
      // Register cleanup with test framework
      registerCleanupHook(cleanup);
    }

    // Create fluent request builder
    const requestBuilder = createFluentRequest(baseUrl);

    return {
      app: testApp,
      container,
      request: requestBuilder,
      port: actualPort,
      baseUrl,
      cleanup,
    };
  } catch (error) {
    // Restore environment on error
    process.env = originalEnv;
    throw error;
  }
}

/**
 * Apply mock providers to the test app.
 */
function applyMockProviders(
  testApp: TestApp,
  providers: Array<MockProviderConfig>,
): void {
  for (const provider of providers) {
    let mockValue: unknown;

    if (provider.useValue !== undefined) {
      mockValue = provider.useValue;
    } else if (provider.useFactory) {
      mockValue = provider.useFactory();
    } else if (provider.useClass) {
      mockValue = new provider.useClass();
    }

    if (mockValue !== undefined) {
      testApp.overrideProvider(provider.provide, mockValue);
    }
  }
}

/**
 * Try to get container from app instance.
 */
function getContainerFromApp(appInstance: IWebServerBuilder): Container {
  // Try different possible container locations
  const possiblePaths = [
    "container",
    "_container",
    "appContainer",
    "Container",
  ];

  for (const path of possiblePaths) {
    const appRecord = appInstance as unknown as Record<string, unknown>;
    const containerOrWrapper = appRecord[path] as
      | { Container?: Container }
      | Container
      | undefined;
    if (containerOrWrapper) {
      // Could be the container wrapper or the container itself
      if ("Container" in containerOrWrapper && containerOrWrapper.Container) {
        return containerOrWrapper.Container;
      }
      if (containerOrWrapper instanceof Container) {
        return containerOrWrapper;
      }
    }
  }

  // If we can't find the container, throw helpful error
  throw new Error(
    "Could not find DI container on app instance. " +
      "Make sure your app extends AppExpress and initializes the container properly.",
  );
}

/**
 * Register cleanup hook with test framework (Jest/Vitest).
 */
function registerCleanupHook(cleanup: () => Promise<void>): void {
  // Try to register with global afterAll/afterEach
  // This works with both Jest and Vitest
  type GlobalWithTestHooks = typeof globalThis & {
    afterAll?: (fn: () => Promise<void>) => void;
  };
  const globalWithHooks = globalThis as GlobalWithTestHooks;
  if (typeof afterAll === "function") {
    afterAll(cleanup);
  } else if (typeof globalWithHooks.afterAll === "function") {
    globalWithHooks.afterAll(cleanup);
  }
}

/**
 * Cleanup all active test apps.
 * Useful for cleanup in test teardown.
 */
export async function cleanupAllTestApps(): Promise<void> {
  const cleanupPromises = activeTestApps.map((app) => app.close());
  await Promise.all(cleanupPromises);
  activeTestApps.length = 0;
}

/**
 * Get the count of active test apps.
 * Useful for debugging test cleanup issues.
 */
export function getActiveTestAppCount(): number {
  return activeTestApps.length;
}
