/**
 * @example Basic Provide Decorators
 * @description Simple service registration with different scopes
 * @runnable true
 */

import {
  provide,
  provideSingleton,
  provideTransient,
} from "../../scope-binding.js";

// Service interfaces
interface IUserService {
  getUsers(): string[];
}

interface ICache {
  get(key: string): string | null;
}

interface IPrototype {
  id: number;
}

// Request-scoped service
provide(IUserService);
export class UserService implements IUserService {
  getUsers(): string[] {
    return ["user1", "user2"];
  }
}

// Singleton-scoped service
provideSingleton(ICache);
export class CacheService implements ICache {
  private cache = new Map<string, string>();

  get(key: string): string | null {
    return this.cache.get(key) || null;
  }
}

// Transient-scoped service
provideTransient(IPrototype);
export class PrototypeService implements IPrototype {
  id = Math.random();
}

/**
 * Example usage
 */
export function runExample() {
  console.log("📘 Example: Basic Provide Decorators");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Services registered:");
  console.log("   - UserService (Request scope)");
  console.log("   - CacheService (Singleton scope)");
  console.log("   - PrototypeService (Transient scope)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

if (require.main === module) {
  runExample();
}

export { runExample, UserService, CacheService, PrototypeService };
