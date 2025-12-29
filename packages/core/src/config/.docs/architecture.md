# Configuration Architecture

> **Internal architecture and design decisions for ExpressoTS configuration system**

## Overview

The configuration system provides type-safe, validated configuration management with:
- Full TypeScript inference
- Multi-environment defaults
- Secret management with auto-redaction
- Helpful validation errors
- Zero-config defaults

## Architecture Components

### 1. Configuration Resolver (`config-resolver.ts`)

The resolver is responsible for:
- Reading environment variables
- Resolving field values
- Applying defaults (including environment-specific)
- Validating field values
- Formatting error messages

**Key Functions:**
- `resolveSchema()` - Main resolver function
- `resolveField()` - Resolve individual field
- `validateField()` - Validate field value
- `formatValidationError()` - Format error messages

### 2. Field Builders (`env-field-builders.ts`)

Builders create `ConfigField` objects with proper typing:

```typescript
Env.string("VAR", options)  // Creates ConfigField<string>
Env.number("VAR", options)  // Creates ConfigField<number>
Env.secret("VAR", options)  // Creates SecretConfigField
```

**Field Types:**
- `ConfigField<T>` - Standard field
- `SecretConfigField` - Secret field (extends ConfigField)
- Each builder returns properly typed field

### 3. Secret Value Wrapper (`secret-value.ts`)

Wraps sensitive values to prevent accidental logging:

**Features:**
- Auto-redaction in `toString()` and `toJSON()`
- Partial reveal in development mode
- Timing-safe comparison
- Safe string conversion

**Implementation:**
- `SecretValueImpl` - Implementation class
- `createSecretValue()` - Factory function
- `isSecretValue()` - Type guard

### 4. Configuration Definition (`define-config.ts`)

Main entry point for creating configuration:

**Process:**
1. Accept schema object
2. Resolve all fields
3. Create `IConfigInstance` with:
   - `values` - Resolved values
   - `isValid()` - Validation check
   - `getErrors()` - Error retrieval
   - `getField()` - Field access

## Data Flow

```
User defines schema
    ↓
defineConfig() creates schema
    ↓
resolveSchema() processes fields
    ↓
For each field:
  - Read env var
  - Apply defaults (env-specific)
  - Validate value
  - Transform if needed
    ↓
Create IConfigInstance
    ↓
User accesses config.values
```

## Type System

### Type Inference

TypeScript infers types from field builders:

```typescript
Env.string()  → ConfigField<string>
Env.number()  → ConfigField<number>
Env.boolean() → ConfigField<boolean>
Env.enum()    → ConfigField<"a" | "b" | "c">
Env.secret()  → SecretConfigField → SecretValue
```

### Schema Type

Schema object type is inferred from field definitions:

```typescript
{
  port: Env.port()     → { port: number }
  host: Env.string()    → { host: string }
  debug: Env.boolean() → { debug: boolean }
}
```

## Validation System

### Validation Process

1. **Type Validation**: Check if value matches expected type
2. **Format Validation**: Check format (email, url, uuid, etc.)
3. **Range Validation**: Check min/max for numbers, length for strings
4. **Required Validation**: Check if required field is present
5. **Custom Validation**: Apply custom validation functions

### Error Formatting

Errors follow `HelpfulErrorFormatter` patterns:
- Clear error messages
- Expected vs received values
- Examples and hints
- Consistent formatting

## Secret Management

### Redaction Strategy

1. **Production**: Always redact (`[REDACTED]`)
2. **Development**: Partial reveal if `allowPartialReveal: true`
3. **Logging**: Always redacted in logs
4. **JSON**: Always redacted in serialization

### Comparison Safety

Uses Node.js `crypto.timingSafeEqual()` for timing-safe comparison to prevent timing attacks.

## Environment Detection

Environment is detected from `NODE_ENV`:
- `development` - Development defaults
- `staging` - Staging defaults
- `production` - Production defaults
- Default: `development`

## Extension Points

### Custom Field Types

Create custom field builders:

```typescript
function customField(envVar: string, options: CustomOptions) {
  return {
    envVar,
    type: "custom",
    options,
    // ... validation logic
  };
}
```

### Custom Validators

Add custom validation:

```typescript
Env.string("VAR", {
  validate: (value) => {
    // Custom validation
    return value.startsWith("prefix");
  },
})
```

## Performance Considerations

1. **Lazy Resolution**: Fields resolved on first access
2. **Caching**: Resolved values cached
3. **Validation**: Validation runs once per field
4. **Secret Comparison**: Uses efficient timing-safe comparison

## Design Decisions

### Why Type Inference?

- **Developer Experience**: No manual type casting needed
- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Full autocomplete support

### Why Secret Wrapper?

- **Safety**: Prevents accidental logging
- **Debugging**: Partial reveal in dev mode
- **Security**: Timing-safe comparison

### Why Multi-Environment Defaults?

- **Flexibility**: Different configs per environment
- **Convenience**: No need for multiple config files
- **Type Safety**: Same type system across environments

## Future Enhancements

1. **Schema Validation**: JSON Schema support
2. **Config Hot Reload**: Reload config without restart
3. **Config Sources**: Support multiple sources (env, file, API)
4. **Config Merging**: Merge configs from multiple sources

---

**See Also:**
- [Public API](./config-public-api.md) - User-facing documentation
- [Examples](./examples/) - Code examples

