/**
 * Per-request HttpContext storage.
 *
 * Replaces the previous `Reflect.defineMetadata(METADATA_KEY.httpContext, ctx, req)`
 * call in `InversifyExpressServer.build()`, which paid the cost of
 * `reflect-metadata` map allocation and key lookup on every single request.
 *
 * A `WeakMap<Request, HttpContext>` is functionally identical (lookup keyed
 * by request reference, GC'd when the request goes out of scope) and is
 * substantially cheaper on the hot path because it bypasses
 * `reflect-metadata`'s string-keyed metadata store.
 *
 * Both `InversifyExpressServer` and `GuardContextFactory` use this module
 * so they observe the same per-request value.
 */
import type { Request } from "express";
import type { HttpContext } from "./interfaces.js";

const httpContextByRequest: WeakMap<Request, HttpContext> = new WeakMap();

export function setHttpContext(req: Request, ctx: HttpContext): void {
  httpContextByRequest.set(req, ctx);
}

export function getHttpContext(req: Request): HttpContext | undefined {
  return httpContextByRequest.get(req);
}

export function hasHttpContext(req: Request): boolean {
  return httpContextByRequest.has(req);
}
