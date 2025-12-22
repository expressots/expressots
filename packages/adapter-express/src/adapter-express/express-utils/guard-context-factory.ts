import "reflect-metadata";
import { Request, Response } from "express";
import { inject, injectable, Container, interfaces } from "@expressots/core";
import type {
  GuardContext,
  RouteMetadata,
  Principal,
} from "@expressots/core";
import type { HttpContext } from "./interfaces";
import type { IScopeExtractor } from "./scope-extractor.interface";
import { METADATA_KEY } from "./constants";

/**
 * Factory for creating GuardContext from Express request/response
 */
@injectable()
export class GuardContextFactory {
  constructor(
    @inject(Container) private container: interfaces.Container,
    @inject("IScopeExtractor") private scopeExtractor: IScopeExtractor,
  ) {}

  /**
   * Create GuardContext from Express request/response
   */
  async create(req: Request, res: Response): Promise<GuardContext> {
    // Get HttpContext (already created by InversifyExpressServer via Reflect.defineMetadata)
    const httpContext = Reflect.getMetadata(METADATA_KEY.httpContext, req) as HttpContext;

    if (!httpContext) {
      throw new Error(
        "HttpContext not found on request. Ensure InversifyExpressServer is properly configured.",
      );
    }

    // Extract scope information
    const scope = await this.scopeExtractor.extract(req);

    // Extract route metadata
    const route: RouteMetadata = {
      controller:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).__expressotsControllerName || "unknown",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      method: (req as any).__expressotsMethod || "unknown",
      path: req.path,
      params: req.params,
      query: req.query,
    };

    // Create guard context
    // Note: httpContext.user is Principal from adapter-express, but GuardContext expects Principal from core
    // They have the same structure, so this is compatible
    // Note: httpContext.container is inversifyInterfaces.Container, but GuardContext expects Container from core
    // They are compatible, so we cast it
    const context: GuardContext = {
      request: req,
      response: res,
      principal: httpContext.user as Principal, // Cast to core Principal type (same structure)
      container: httpContext.container as Container, // Request-scoped child container!
      scope,
      route,
      getScoped: <T>(identifier: interfaces.ServiceIdentifier<T>, scopeName?: string) => {
        // Resolve with scope awareness
        // Note: scopeName is optional and can be used for custom scopes (e.g., tenant)
        if (scopeName) {
          // For custom scopes, use named binding or scope registry
          // For now, fallback to regular get (can be enhanced later)
          return httpContext.container.get<T>(identifier);
        }
        return httpContext.container.get<T>(identifier);
      },
      getTenantId: () => scope.tenant,
      getRequestId: () => scope.request,
    };

    return context;
  }
}

