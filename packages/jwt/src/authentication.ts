import {
  AppError,
  Guard,
  GuardResult,
  SecurityContext,
  ProviderRegistry,
} from "@expressots/core";
import type {
  GuardContext,
  IGuard,
  Principal,
  interfaces,
  JwtSessionOptions,
  JwtSessionContextResolver,
} from "@expressots/core";
import { getHttpContext } from "@expressots/adapter-express";
import type { Request, RequestHandler } from "express";
import type { VerifiedClaims } from "./types.js";
import { JwtProvider } from "./jwt.provider.js";

export interface JwtIdentity extends VerifiedClaims {
  id: string;
  roles: Array<string>;
  permissions: Array<string>;
}
export class JwtPrincipal implements Principal<JwtIdentity> {
  constructor(readonly details: JwtIdentity) {}
  async isAuthenticated(): Promise<boolean> {
    return true;
  }
  async isInRole(role: string): Promise<boolean> {
    return this.details.roles.includes(role);
  }
  async hasPermission(permission: string): Promise<boolean> {
    return this.details.permissions.includes(permission);
  }
  async isResourceOwner(resourceId: unknown): Promise<boolean> {
    return resourceId === this.details.sub;
  }
}
function bearer(
  request: Request,
  headerName = "authorization",
): string | undefined {
  const header = request.headers[headerName];
  if (header === undefined) return undefined;
  if (typeof header !== "string") return "";
  const match =
    /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
  // Invalid PRESENT headers reach the registered provider as invalid tokens,
  // preserving the application's AppError module identity across CJS/ESM.
  return match?.[1] ?? "";
}
function providerBinding(
  container: interfaces.Container,
): interfaces.ServiceIdentifier<JwtProvider> {
  if (container.isBound(JwtProvider)) return JwtProvider;
  // The resolver may load the CJS plugin while an ESM app registers its ESM class.
  // Use the framework registry to find the application-bound target in that case.
  const candidates = new ProviderRegistry(container)
    .getBySource("external")
    .filter((p) => p.name === "JwtProvider" && container.isBound(p.target));
  if (candidates.length !== 1)
    throw new Error(
      "Register exactly one JwtProvider with CreateModule before using JWT sessions",
    );
  return candidates[0].target as interfaces.ServiceIdentifier<JwtProvider>;
}
async function authenticate(
  provider: JwtProvider,
  request: Request,
  token: string,
  contextResolver: JwtSessionContextResolver = getHttpContext,
): Promise<JwtPrincipal> {
  const claims = await provider.verifyAccessToken(token);
  const principal = new JwtPrincipal({
    ...claims,
    id: claims.sub,
    ...provider.authorizationClaims(claims),
  });
  const http = contextResolver(request);
  if (!http)
    throw new AppError(
      "JWT authentication requires the Express request context",
    );
  // Bind a constant in THIS child container. Inversify Request scope alone covers
  // one resolution graph, not all subsequent resolutions during an HTTP request.
  const security = new SecurityContext();
  for (const permission of principal.details.permissions)
    security.addPermission(permission);
  if (http.container.isCurrentBound("ISecurityContext"))
    http.container.unbind("ISecurityContext");
  http.container.bind("ISecurityContext").toConstantValue(security);
  http.user = principal;
  return principal;
}
/** Stateless guard: resolves provider from each request's child container. */
@Guard({ priority: 0, cacheable: false })
export class JwtAuthGuard implements IGuard {
  readonly priority = 0;
  readonly cacheable = false;
  async canActivate(context: GuardContext): Promise<GuardResult> {
    try {
      const token = bearer(context.request);
      if (!token)
        return GuardResult.deny(
          AppError.unauthorized("Authentication required"),
        );
      const provider = context.getScoped(providerBinding(context.container));
      context.principal = await authenticate(provider, context.request, token);
      return GuardResult.allow();
    } catch {
      return GuardResult.deny(
        AppError.unauthorized("Invalid authentication token"),
      );
    }
  }
}
/** Optional provider entry point used by core; no cryptography lives in core. */
export function createJwtSessionMiddleware(
  options: JwtSessionOptions = {},
  container?: interfaces.Container,
  contextResolver: JwtSessionContextResolver = getHttpContext,
): RequestHandler {
  if (!container)
    throw new Error(
      "Register JwtProvider with CreateModule before using JWT sessions",
    );
  const binding = providerBinding(container);
  if (options.storage !== undefined && options.storage !== "header")
    throw new Error(
      "JWT sessions support Bearer headers only; cookie transport is not implemented",
    );
  if (
    options.algorithm !== undefined ||
    options.issuer !== undefined ||
    options.audience !== undefined ||
    options.expiresIn !== undefined
  )
    throw new Error(
      "Configure JWT algorithms, issuer, audience and lifetime on JwtProvider, not session options",
    );
  const headerName = options.headerName?.toLowerCase() ?? "authorization";
  if (!/^[a-z0-9-]+$/.test(headerName))
    throw new Error("JWT headerName is invalid");
  return (request, _response, next): void => {
    // Missing tokens remain anonymous for public login/refresh routes. Protected
    // routes use RequireAuthentication. Present but invalid tokens fail closed.
    Promise.resolve()
      .then(async () => {
        const token = bearer(request, headerName);
        if (token !== undefined) {
          const http = contextResolver(request);
          if (!http)
            throw new AppError(
              "JWT session requires the Express request context",
            );
          await authenticate(
            http.container.get<JwtProvider>(binding),
            request,
            token,
            contextResolver,
          );
        }
        next();
      })
      .catch(next);
  };
}
