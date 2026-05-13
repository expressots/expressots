/**
 * Smart Field Detector
 * @module @expressots/core/validation
 *
 * Intelligently detects validation rules based on field naming patterns.
 * This is one of ExpressoTS's jaw-dropping features - no other framework has this!
 */

import {
  SmartFieldPattern,
  ValidationFieldError,
} from "./validation.interface.js";

/**
 * Smart Field Detector
 *
 * Automatically applies validation based on field naming conventions.
 * For example, a field named "email" will automatically be validated as an email,
 * and a field named "password" will require minimum 8 characters.
 *
 * @example
 * ```typescript
 * // These fields get automatic validation based on their names!
 * interface UserDTO {
 *     email: string;        // Validated as email format
 *     password: string;     // Requires min 8 chars
 *     phoneNumber: string;  // Validated as phone format
 *     website: string;      // Validated as URL
 *     userId: string;       // Validated as UUID
 *     createdAt: Date;      // Parsed as date
 * }
 * ```
 */
export class SmartFieldDetector {
  private patterns: Array<SmartFieldPattern> = [];
  private enabled = true;

  constructor() {
    this.registerDefaultPatterns();
  }

  /**
   * Enable or disable smart detection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if smart detection is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a custom field pattern
   * @param pattern - The pattern to register
   */
  registerPattern(pattern: SmartFieldPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Clear all registered patterns
   */
  clearPatterns(): void {
    this.patterns = [];
  }

  /**
   * Reset to default patterns
   */
  resetToDefaults(): void {
    this.patterns = [];
    this.registerDefaultPatterns();
  }

  /**
   * Detect validation for a field based on its name and value
   * @param fieldName - Name of the field
   * @param value - Value of the field
   * @param type - TypeScript type (if available from reflection)
   * @returns Array of validation errors (empty if valid)
   */
  validate(
    fieldName: string,
    value: unknown,
    type?: unknown,
  ): Array<ValidationFieldError> {
    if (!this.enabled) {
      return [];
    }

    const errors: Array<ValidationFieldError> = [];

    for (const pattern of this.patterns) {
      // Check if field name matches any of the patterns
      const matches = pattern.patterns.some((regex) => regex.test(fieldName));

      if (matches) {
        const error = pattern.validate(value);
        if (error) {
          // Enhance error with pattern info
          error.path = fieldName;
          error.example = error.example ?? pattern.example;
          error.hint = error.hint ?? pattern.hint;
          errors.push(error);
        }
        break; // Only apply first matching pattern
      }
    }

    // Also validate based on TypeScript type if available
    if (type && errors.length === 0) {
      const typeError = this.validateType(fieldName, value, type);
      if (typeError) {
        errors.push(typeError);
      }
    }

    return errors;
  }

  /**
   * Validate multiple fields at once
   * @param data - Object with field values
   * @param types - Optional type information from reflection
   * @returns Array of validation errors
   */
  validateObject(
    data: Record<string, unknown>,
    types?: Record<string, unknown>,
  ): Array<ValidationFieldError> {
    if (!this.enabled) {
      return [];
    }

    const errors: Array<ValidationFieldError> = [];

    for (const [fieldName, value] of Object.entries(data)) {
      const fieldType = types?.[fieldName];
      const fieldErrors = this.validate(fieldName, value, fieldType);
      errors.push(...fieldErrors);
    }

    return errors;
  }

  /**
   * Register default smart detection patterns
   */
  private registerDefaultPatterns(): void {
    // Email pattern
    this.patterns.push({
      name: "email",
      patterns: [/email/i, /e-mail/i, /emailAddress/i],
      validate: (value) => this.validateEmail(value),
      example: "user@example.com",
      hint: "Must be a valid email address with @ and domain",
    });

    // Password pattern
    this.patterns.push({
      name: "password",
      patterns: [/^password$/i, /^pwd$/i, /^passwd$/i, /^pass$/i],
      validate: (value) => this.validatePassword(value),
      example: "SecureP@ss123",
      hint: "Password should be at least 8 characters",
    });

    // Phone number pattern
    this.patterns.push({
      name: "phone",
      patterns: [/phone/i, /mobile/i, /cell/i, /tel/i, /telephone/i],
      validate: (value) => this.validatePhone(value),
      example: "+1234567890",
      hint: "Include country code for international numbers",
    });

    // URL pattern
    this.patterns.push({
      name: "url",
      patterns: [/url$/i, /URL$/i, /website/i, /link/i, /href/i],
      validate: (value) => this.validateUrl(value),
      example: "https://example.com",
      hint: "Include protocol (http:// or https://)",
    });

    // UUID pattern
    this.patterns.push({
      name: "uuid",
      patterns: [/Id$/i, /ID$/i, /uuid/i, /guid/i],
      validate: (value) => this.validateUuid(value),
      example: "550e8400-e29b-41d4-a716-446655440000",
      hint: "UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    });

    // Date pattern
    this.patterns.push({
      name: "date",
      patterns: [
        /At$/i,
        /Date$/i,
        /^created/i,
        /^updated/i,
        /^deleted/i,
        /time$/i,
      ],
      validate: (value) => this.validateDate(value),
      example: "2024-01-15T10:30:00Z",
      hint: "Use ISO 8601 format (YYYY-MM-DD or full ISO string)",
    });

    // Age/Count pattern (positive integer)
    this.patterns.push({
      name: "positiveInteger",
      patterns: [/^age$/i, /Count$/i, /^count$/i, /quantity/i, /amount/i],
      validate: (value) => this.validatePositiveInteger(value),
      example: 42,
      hint: "Must be a positive whole number",
    });

    // Zip/Postal code pattern
    this.patterns.push({
      name: "postalCode",
      patterns: [/zip/i, /postal/i, /postcode/i],
      validate: (value) => this.validatePostalCode(value),
      example: "12345",
      hint: "Enter a valid postal/zip code",
    });

    // Credit card pattern
    this.patterns.push({
      name: "creditCard",
      patterns: [/card.*number/i, /creditCard/i, /cc.*num/i],
      validate: (value) => this.validateCreditCard(value),
      example: "4111111111111111",
      hint: "Enter card number without spaces or dashes",
    });

    // IP address pattern
    this.patterns.push({
      name: "ipAddress",
      patterns: [/ip/i, /ipAddress/i],
      validate: (value) => this.validateIpAddress(value),
      example: "192.168.1.1",
      hint: "Enter a valid IPv4 or IPv6 address",
    });
  }

  /**
   * Validate based on TypeScript type
   */
  private validateType(
    fieldName: string,
    value: unknown,
    type: unknown,
  ): ValidationFieldError | null {
    // Type is the constructor function (String, Number, Boolean, etc.)
    if (type === Number && typeof value !== "number") {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          path: fieldName,
          message: "Must be a valid number",
          code: "invalid_type",
          received: value,
          expected: "number",
          example: 42,
          hint: "Remove quotes and non-numeric characters",
        };
      }
    }

    if (type === Boolean && typeof value !== "boolean") {
      if (
        value !== "true" &&
        value !== "false" &&
        value !== "1" &&
        value !== "0"
      ) {
        return {
          path: fieldName,
          message: "Must be a boolean value",
          code: "invalid_type",
          received: value,
          expected: "boolean",
          example: true,
          hint: "Use true, false, 1, or 0",
        };
      }
    }

    return null;
  }

  // Validation helper methods

  private validateEmail(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null; // Let required validation handle this
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "Email must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        path: "",
        message: "Must be a valid email address",
        code: "invalid_email",
        received: value,
        expected: "valid email format",
      };
    }

    return null;
  }

  private validatePassword(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null; // Let required validation handle this
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "Password must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    if (value.length < 8) {
      return {
        path: "",
        message: "Password must be at least 8 characters",
        code: "min_length",
        received: value,
        expected: "string with at least 8 characters",
      };
    }

    return null;
  }

  private validatePhone(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "Phone number must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    // Simple phone validation - at least 10 digits
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return {
        path: "",
        message: "Phone number must have at least 10 digits",
        code: "invalid_phone",
        received: value,
        expected: "valid phone number",
      };
    }

    return null;
  }

  private validateUrl(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "URL must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    try {
      new URL(value);
      return null;
    } catch {
      return {
        path: "",
        message: "Must be a valid URL",
        code: "invalid_url",
        received: value,
        expected: "valid URL with protocol",
      };
    }
  }

  private validateUuid(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      // Check if it's a valid numeric ID
      if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return null; // Allow numeric IDs for *Id fields
      }
      return {
        path: "",
        message: "ID must be a string (UUID) or positive integer",
        code: "invalid_type",
        received: value,
        expected: "string or number",
      };
    }

    // If it's a numeric string, that's also valid
    if (/^\d+$/.test(value)) {
      return null;
    }

    // Check UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return {
        path: "",
        message: "Must be a valid UUID or numeric ID",
        code: "invalid_uuid",
        received: value,
        expected: "UUID format or numeric ID",
      };
    }

    return null;
  }

  private validateDate(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (value instanceof Date && !isNaN(value.getTime())) {
      return null;
    }

    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return null;
      }
    }

    return {
      path: "",
      message: "Must be a valid date",
      code: "invalid_date",
      received: value,
      expected: "valid date string or timestamp",
    };
  }

  private validatePositiveInteger(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const num = typeof value === "number" ? value : Number(value);

    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      return {
        path: "",
        message: "Must be a positive integer",
        code: "invalid_positive_integer",
        received: value,
        expected: "positive whole number",
      };
    }

    return null;
  }

  private validatePostalCode(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "Postal code must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    // Simple validation - alphanumeric, 3-10 chars
    if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(value)) {
      return {
        path: "",
        message: "Invalid postal code format",
        code: "invalid_postal_code",
        received: value,
        expected: "valid postal/zip code",
      };
    }

    return null;
  }

  private validateCreditCard(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "Credit card number must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    // Remove spaces and dashes
    const cleaned = value.replace(/[\s-]/g, "");

    // Check if all digits
    if (!/^\d{13,19}$/.test(cleaned)) {
      return {
        path: "",
        message: "Invalid credit card number",
        code: "invalid_credit_card",
        received: value,
        expected: "13-19 digit card number",
      };
    }

    // Luhn algorithm check
    if (!this.luhnCheck(cleaned)) {
      return {
        path: "",
        message: "Invalid credit card number (checksum failed)",
        code: "invalid_credit_card",
        received: value,
        expected: "valid card number",
      };
    }

    return null;
  }

  private validateIpAddress(value: unknown): ValidationFieldError | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return {
        path: "",
        message: "IP address must be a string",
        code: "invalid_type",
        received: value,
        expected: "string",
      };
    }

    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (ipv4Regex.test(value)) {
      // Validate each octet is 0-255
      const octets = value.split(".").map(Number);
      if (octets.every((o) => o >= 0 && o <= 255)) {
        return null;
      }
    }

    if (ipv6Regex.test(value)) {
      return null;
    }

    return {
      path: "",
      message: "Invalid IP address",
      code: "invalid_ip",
      received: value,
      expected: "valid IPv4 or IPv6 address",
    };
  }

  /**
   * Luhn algorithm for credit card validation
   */
  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}
