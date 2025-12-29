/**
 * Secret Value Wrapper
 *
 * @module config
 *
 * Wraps sensitive values to prevent accidental logging.
 *
 * UNIQUE: Auto-redacted in logs, partial reveal in dev mode!
 *
 * @example
 * ```typescript
 * const secret = new SecretValueImpl("sk_live_abc123xyz789");
 *
 * // Safe for logging - shows redacted
 * console.log(secret);        // "[REDACTED]"
 * console.log(`Key: ${secret}`); // "Key: [REDACTED]"
 *
 * // Access actual value when needed
 * const key = secret.value;   // "sk_live_abc123xyz789"
 *
 * // Partial reveal for debugging (dev mode only)
 * console.log(secret.reveal()); // "sk_l...z789"
 *
 * // Safe comparison without revealing
 * secret.equals("sk_live_abc123xyz789"); // true
 * ```
 */

import { SecretValue, SecretFieldOptions } from "./config.interfaces";
import * as nodeCrypto from "crypto";

/**
 * Implementation of SecretValue interface.
 *
 * @internal
 */
export class SecretValueImpl implements SecretValue {
  private readonly _value: string;
  private readonly _options: SecretFieldOptions;
  private readonly _isDev: boolean;

  constructor(value: string, options: SecretFieldOptions = {}) {
    this._value = value;
    this._options = {
      revealStart: 0,
      revealEnd: 4,
      allowPartialReveal: true,
      ...options,
    };
    this._isDev = process.env.NODE_ENV === "development";
  }

  /**
   * Get the actual secret value.
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check if secret is set (non-empty).
   */
  get isSet(): boolean {
    return this._value !== undefined && this._value !== null && this._value.length > 0;
  }

  /**
   * Get length of secret.
   */
  get length(): number {
    return this._value?.length ?? 0;
  }

  /**
   * Returns redacted string for logging.
   * Prevents accidental exposure in logs.
   */
  toString(): string {
    if (!this.isSet) {
      return "[NOT SET]";
    }

    // In development, show partial if allowed
    if (this._isDev && this._options.allowPartialReveal) {
      return this.reveal();
    }

    return "[REDACTED]";
  }

  /**
   * Custom JSON serialization - always redacted.
   */
  toJSON(): string {
    return "[REDACTED]";
  }

  /**
   * Partial reveal for debugging.
   * Shows first/last N characters with dots in between.
   *
   * Only works in development mode with allowPartialReveal enabled.
   *
   * @example
   * ```typescript
   * // With revealStart: 4, revealEnd: 4
   * secret.reveal() // "sk_l...z789"
   * ```
   */
  reveal(): string {
    if (!this.isSet) {
      return "[NOT SET]";
    }

    // Only reveal in development if allowed
    if (!this._isDev || !this._options.allowPartialReveal) {
      return "[REDACTED]";
    }

    const value = this._value;
    const revealStart = this._options.revealStart ?? 0;
    const revealEnd = this._options.revealEnd ?? 4;

    // If value is too short to reveal meaningfully
    if (value.length <= revealStart + revealEnd + 3) {
      return "[REDACTED]";
    }

    const start = value.slice(0, revealStart);
    const end = value.slice(-revealEnd);

    if (revealStart === 0) {
      return `...${end}`;
    }

    return `${start}...${end}`;
  }

  /**
   * Compare secret value without revealing.
   * Safe for authentication checks.
   *
   * Uses timing-safe comparison to prevent timing attacks.
   */
  equals(other: string): boolean {
    if (!this.isSet || !other) {
      return false;
    }

    // Use timing-safe comparison if available (Node.js crypto)
    try {
      const a = Buffer.from(this._value);
      const b = Buffer.from(other);

      if (a.length !== b.length) {
        return false;
      }

      return nodeCrypto.timingSafeEqual(a, b);
    } catch {
      // Fallback to regular comparison
      return this._value === other;
    }
  }

  /**
   * Prevent inspection from revealing the value.
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString();
  }
}

/**
 * Create a SecretValue from a string.
 *
 * @param value - The secret string
 * @param options - Secret field options
 * @returns SecretValue wrapper
 *
 * @public API
 */
export function createSecretValue(
  value: string,
  options: SecretFieldOptions = {},
): SecretValue {
  return new SecretValueImpl(value, options);
}

/**
 * Check if a value is a SecretValue.
 *
 * @param value - Value to check
 * @returns true if value is a SecretValue
 *
 * @public API
 */
export function isSecretValue(value: unknown): value is SecretValue {
  return value instanceof SecretValueImpl;
}

