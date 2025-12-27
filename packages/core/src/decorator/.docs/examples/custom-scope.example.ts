/**
 * @example Custom Scope Provider
 * @description Tenant-scoped service registration
 * @runnable true
 */

import { provideInScope } from "../../scope-binding";

// Service interface
interface ITenantService {
  getTenantId(): string;
}

// Tenant-scoped service
provideInScope(ITenantService, "tenant")
export class TenantService implements ITenantService {
  constructor(private tenantId: string) {
    this.tenantId = tenantId;
  }

  getTenantId(): string {
    return this.tenantId;
  }
}

/**
 * Example usage
 */
export function runExample() {
  console.log("📘 Example: Custom Scope Provider");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ TenantService registered with 'tenant' scope");
  console.log("   - One instance per tenant");
  console.log("   - Shared across requests for same tenant");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, TenantService };

