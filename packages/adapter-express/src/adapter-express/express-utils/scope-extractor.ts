import { Request } from "express";
import { injectable } from "@expressots/core";
import type { GuardScope } from "@expressots/core";
import type { IScopeExtractor } from "./scope-extractor.interface";

/**
 * Extracts scope information from requests
 * Supports tenant extraction from subdomain, header, or param
 * Note: This is bound manually in setupAuthorizationForExpress() to allow user overrides
 */
@injectable()
export class ScopeExtractor implements IScopeExtractor {
  async extract(req: Request): Promise<GuardScope> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionId = (req as any).session?.id as string | undefined;
    return {
      tenant: this.extractTenant(req),
      request: this.generateRequestId(req),
      session: sessionId,
      transaction: req.headers["x-transaction-id"] as string | undefined,
    };
  }

  /**
   * Extract tenant ID from multiple sources
   * @private
   */
  private extractTenant(req: Request): string | undefined {
    // Try subdomain first
    if (req.subdomains && req.subdomains.length > 0) {
      return req.subdomains[0];
    }

    // Try header
    const headerTenant = req.headers["x-tenant-id"] as string;
    if (headerTenant) {
      return headerTenant;
    }

    // Try route parameter
    const paramTenant = req.params.tenantId as string;
    if (paramTenant) {
      return paramTenant;
    }

    return undefined;
  }

  /**
   * Generate or retrieve request ID
   * @private
   */
  private generateRequestId(req: Request): string {
    // Try to get existing request ID (if set by middleware)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingId = (req as any).id as string;
    if (existingId) {
      return existingId;
    }

    // Generate new ID
    return `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

