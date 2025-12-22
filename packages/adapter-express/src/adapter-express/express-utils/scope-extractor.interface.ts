import { Request } from "express";
import type { GuardScope } from "@expressots/core";

/**
 * Interface for extracting scope information from requests
 */
export interface IScopeExtractor {
  /**
   * Extract scope information from request
   * @param req - Express request
   */
  extract(req: Request): Promise<GuardScope>;
}

