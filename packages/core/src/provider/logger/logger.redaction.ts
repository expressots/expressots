/**
 * @file logger.redaction.ts
 * @description Automatic sensitive data redaction for logs
 * @module @expressots/core/provider/logger
 *
 * Features:
 * - Pattern-based field name redaction
 * - Regex-based value redaction (credit cards, SSN, tokens)
 * - Partial redaction (show last N characters)
 * - Deep object scanning with circular reference handling
 * - Fully configurable patterns and behavior
 *
 * @example
 * ```typescript
 * const redactor = new Redactor();
 *
 * // Redacts password field
 * redactor.redact({ password: "secret123" });
 * // Result: { password: "••••••••" }
 *
 * // Partial redaction for credit cards
 * redactor.redact({ card: "4532015112830366" });
 * // Result: { card: "••••••••••••0366" }
 * ```
 */

/**
 * Configuration for sensitive data redaction.
 * @public API
 */
export interface RedactionConfig {
  /** Enable/disable redaction globally */
  enabled: boolean;

  /** Replacement string for redacted values */
  replacement: string;

  /** Field name patterns to redact (case-insensitive) */
  fieldPatterns: Array<string>;

  /** Regex patterns to detect and redact in values */
  valuePatterns: Array<RedactionPattern>;

  /** Enable partial redaction (show last N chars) */
  partialRedaction: boolean;

  /** Number of characters to reveal at end (for partial redaction) */
  revealLastChars: number;

  /** Maximum object depth to scan (prevent infinite recursion) */
  maxDepth: number;

  /** Fields to never redact (whitelist) */
  whitelist: Array<string>;
}

/**
 * A regex pattern with optional partial redaction settings.
 * @public API
 */
export interface RedactionPattern {
  /** Name of the pattern (for debugging/configuration) */
  name: string;

  /** Regex pattern to match */
  pattern: RegExp;

  /** Override partial redaction for this pattern */
  partialRedaction?: boolean;

  /** Override reveal count for this pattern */
  revealLastChars?: number;

  /** Custom replacement for this pattern */
  replacement?: string;
}

/**
 * Default field name patterns that indicate sensitive data.
 * Case-insensitive matching.
 */
export const DEFAULT_FIELD_PATTERNS: Array<string> = [
  // Authentication & Authorization
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "apikey",
  "api_key",
  "apitoken",
  "api_token",
  "auth",
  "authorization",
  "bearer",
  "credential",
  "credentials",

  // Personal Identifiable Information (PII)
  "ssn",
  "socialsecurity",
  "social_security",
  "taxid",
  "tax_id",
  "nationalid",
  "national_id",

  // Financial
  "creditcard",
  "credit_card",
  "cardnumber",
  "card_number",
  "cvv",
  "cvc",
  "ccv",
  "pin",
  "accountnumber",
  "account_number",
  "routingnumber",
  "routing_number",
  "bankaccount",
  "bank_account",

  // Security
  "privatekey",
  "private_key",
  "publickey",
  "public_key",
  "encryptionkey",
  "encryption_key",
  "signingkey",
  "signing_key",
  "salt",
  "hash",
  "cipher",

  // Session/Cookie
  "session",
  "sessionid",
  "session_id",
  "cookie",

  // Other
  "otp",
  "totp",
  "mfa",
  "2fa",
];

/**
 * Default regex patterns for detecting sensitive values.
 * These patterns match common formats regardless of field name.
 */
export const DEFAULT_VALUE_PATTERNS: Array<RedactionPattern> = [
  // Credit Card Numbers (Visa, MasterCard, Amex, Discover, etc.)
  {
    name: "credit_card",
    pattern:
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // US Social Security Number (XXX-XX-XXXX or XXXXXXXXX)
  {
    name: "ssn",
    pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // API Keys (common formats)
  {
    name: "api_key_stripe",
    pattern: /\b(sk_live_|pk_live_|sk_test_|pk_test_)[a-zA-Z0-9]{20,}\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // AWS Access Key ID
  {
    name: "aws_access_key",
    pattern: /\b(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // AWS Secret Key (40 chars base64)
  {
    name: "aws_secret_key",
    pattern: /\b[A-Za-z0-9+/]{40}\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // JWT Tokens
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    partialRedaction: true,
    revealLastChars: 8,
  },

  // Generic Bearer Token
  {
    name: "bearer_token",
    pattern: /\b[Bb]earer\s+[A-Za-z0-9._~+/-]+=*\b/g,
    partialRedaction: false,
    replacement: "Bearer ••••••••",
  },

  // UUID-like tokens (potential session IDs)
  {
    name: "uuid",
    pattern:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // Generic hex tokens (32+ chars - could be API keys, hashes)
  {
    name: "hex_token",
    pattern: /\b[0-9a-f]{32,}\b/gi,
    partialRedaction: true,
    revealLastChars: 4,
  },

  // Base64 encoded data (40+ chars - could be secrets)
  {
    name: "base64_token",
    pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
    partialRedaction: true,
    revealLastChars: 4,
  },
];

/**
 * Get default redaction configuration.
 */
export function getDefaultRedactionConfig(): RedactionConfig {
  return {
    enabled: true,
    replacement: "••••••••",
    fieldPatterns: [...DEFAULT_FIELD_PATTERNS],
    valuePatterns: [...DEFAULT_VALUE_PATTERNS],
    partialRedaction: false, // Default to full redaction
    revealLastChars: 4,
    maxDepth: 10,
    whitelist: [],
  };
}

/**
 * Redactor class for automatic sensitive data redaction.
 * @public API
 *
 * @example
 * ```typescript
 * const redactor = new Redactor();
 *
 * // Basic usage
 * const safe = redactor.redact(sensitiveObject);
 *
 * // Custom configuration
 * const customRedactor = new Redactor({
 *   fieldPatterns: ['mySecretField'],
 *   partialRedaction: true,
 *   revealLastChars: 4,
 * });
 * ```
 */
export class Redactor {
  private config: RedactionConfig;
  private fieldPatternSet: Set<string>;

  constructor(config?: Partial<RedactionConfig>) {
    this.config = {
      ...getDefaultRedactionConfig(),
      ...config,
    };

    // Pre-compile field patterns for faster lookup (lowercase for case-insensitive)
    this.fieldPatternSet = new Set(
      this.config.fieldPatterns.map((p) => p.toLowerCase()),
    );
  }

  /**
   * Update redaction configuration.
   * @param config - Partial configuration to merge
   */
  configure(config: Partial<RedactionConfig>): void {
    this.config = { ...this.config, ...config };
    this.fieldPatternSet = new Set(
      this.config.fieldPatterns.map((p) => p.toLowerCase()),
    );
  }

  /**
   * Add custom field patterns to redact.
   * @param patterns - Field name patterns to add
   */
  addFieldPatterns(...patterns: Array<string>): void {
    for (const pattern of patterns) {
      this.config.fieldPatterns.push(pattern);
      this.fieldPatternSet.add(pattern.toLowerCase());
    }
  }

  /**
   * Add custom value patterns to redact.
   * @param patterns - Regex patterns to add
   */
  addValuePatterns(...patterns: Array<RedactionPattern>): void {
    this.config.valuePatterns.push(...patterns);
  }

  /**
   * Add fields to whitelist (never redact).
   * @param fields - Field names to whitelist
   */
  addWhitelist(...fields: Array<string>): void {
    this.config.whitelist.push(...fields);
  }

  /**
   * Redact sensitive data from an object or value.
   * Creates a deep copy with sensitive data replaced.
   *
   * @param value - The value to redact
   * @returns A new value with sensitive data redacted
   */
  redact<T>(value: T): T {
    if (!this.config.enabled) {
      return value;
    }

    const seen = new WeakSet();
    return this.redactValue(value, "", seen, 0) as T;
  }

  /**
   * Redact a string value using regex patterns.
   * @param value - String to redact
   * @returns Redacted string
   */
  redactString(value: string): string {
    if (!this.config.enabled || typeof value !== "string") {
      return value;
    }

    let result = value;
    for (const pattern of this.config.valuePatterns) {
      result = this.applyValuePattern(result, pattern);
    }
    return result;
  }

  /**
   * Check if a field name should be redacted.
   * @param fieldName - Field name to check
   * @returns true if field should be redacted
   */
  shouldRedactField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();

    // Check whitelist first
    if (this.config.whitelist.some((w) => lowerField === w.toLowerCase())) {
      return false;
    }

    // Check if any pattern matches (partial match allowed)
    for (const pattern of this.config.fieldPatterns) {
      if (lowerField.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Internal recursive redaction method.
   */
  private redactValue(
    value: unknown,
    fieldName: string,
    seen: WeakSet<object>,
    depth: number,
  ): unknown {
    // Depth limit check
    if (depth > this.config.maxDepth) {
      return "[Max Depth Exceeded]";
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value === "string") {
      // Check if field name indicates sensitive data
      if (fieldName && this.shouldRedactField(fieldName)) {
        return this.createRedactedValue(value);
      }
      // Check value patterns
      return this.redactString(value);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      // Numbers/booleans in sensitive fields should be redacted
      if (fieldName && this.shouldRedactField(fieldName)) {
        return this.config.replacement;
      }
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.redactValue(item, `${fieldName}[${index}]`, seen, depth + 1),
      );
    }

    // Handle objects
    if (typeof value === "object") {
      // Circular reference check
      if (seen.has(value)) {
        return "[Circular Reference]";
      }
      seen.add(value);

      // Handle special objects
      if (value instanceof Date) {
        return value;
      }
      if (value instanceof RegExp) {
        return value;
      }
      if (value instanceof Error) {
        // Redact error messages but preserve structure
        return {
          name: value.name,
          message: this.redactString(value.message),
          stack: value.stack ? this.redactString(value.stack) : undefined,
        };
      }

      // Handle Map
      if (value instanceof Map) {
        const redactedMap = new Map();
        for (const [key, val] of value.entries()) {
          const redactedKey = typeof key === "string" ? key : key;
          const redactedVal = this.redactValue(
            val,
            String(key),
            seen,
            depth + 1,
          );
          redactedMap.set(redactedKey, redactedVal);
        }
        return redactedMap;
      }

      // Handle Set
      if (value instanceof Set) {
        const redactedSet = new Set();
        for (const item of value) {
          redactedSet.add(this.redactValue(item, "", seen, depth + 1));
        }
        return redactedSet;
      }

      // Handle plain objects
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.redactValue(val, key, seen, depth + 1);
      }
      return result;
    }

    // Handle functions (don't include in logs)
    if (typeof value === "function") {
      return "[Function]";
    }

    // Handle symbols
    if (typeof value === "symbol") {
      return value.toString();
    }

    return value;
  }

  /**
   * Create a redacted value string with optional partial reveal.
   */
  private createRedactedValue(value: string): string {
    if (
      !this.config.partialRedaction ||
      value.length <= this.config.revealLastChars
    ) {
      return this.config.replacement;
    }

    const revealPart = value.slice(-this.config.revealLastChars);
    const hiddenLength = value.length - this.config.revealLastChars;
    const hiddenPart = "•".repeat(Math.min(hiddenLength, 12)); // Cap at 12 dots for readability

    return hiddenPart + revealPart;
  }

  /**
   * Apply a regex pattern to redact values in a string.
   */
  private applyValuePattern(value: string, pattern: RedactionPattern): string {
    // Reset lastIndex for global patterns
    if (pattern.pattern.global) {
      pattern.pattern.lastIndex = 0;
    }

    return value.replace(pattern.pattern, (match) => {
      // Use pattern-specific settings or global config
      const usePartial =
        pattern.partialRedaction ?? this.config.partialRedaction;
      const revealChars =
        pattern.revealLastChars ?? this.config.revealLastChars;
      const replacement = pattern.replacement ?? this.config.replacement;

      if (!usePartial || match.length <= revealChars) {
        return replacement;
      }

      const revealPart = match.slice(-revealChars);
      const hiddenLength = match.length - revealChars;
      const hiddenPart = "•".repeat(Math.min(hiddenLength, 12));

      return hiddenPart + revealPart;
    });
  }
}

/**
 * Global redactor instance for convenience.
 */
let globalRedactor: Redactor | null = null;

/**
 * Get or create the global redactor instance.
 */
export function getGlobalRedactor(): Redactor {
  if (!globalRedactor) {
    globalRedactor = new Redactor();
  }
  return globalRedactor;
}

/**
 * Configure the global redactor.
 * @param config - Configuration to apply
 */
export function configureGlobalRedactor(
  config: Partial<RedactionConfig>,
): void {
  getGlobalRedactor().configure(config);
}

/**
 * Redact sensitive data using the global redactor.
 * Convenience function for quick redaction.
 * @param value - Value to redact
 * @returns Redacted value
 */
export function redact<T>(value: T): T {
  return getGlobalRedactor().redact(value);
}
