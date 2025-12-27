# Architecture Decision Records (ADRs)

> 📋 **Purpose**: Document why architectural decisions were made

This log tracks significant architectural decisions for the application bootstrap system.

---

## ADR-001: Opt-in Environment File Loading

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

In ExpressoTS v3.x, the framework automatically loaded `.env` files, which caused issues in containerized deployments (Docker, Kubernetes) where environment variables are injected via `process.env` rather than files.

**Problems**:
- Applications failed in Docker/K8s when `.env` files were missing
- No way to disable file loading for containerized deployments
- Breaking change needed for v4.0

### Decision

Make `envFileConfig` **undefined by default**. Only load `.env` files when explicitly configured via `envFileConfig`.

**Key Points**:
- Zero-config bootstrap skips .env loading entirely
- Templates can opt-in by providing `envFileConfig`
- Backward compatible path: templates show best practices

### Consequences

**Positive**:
- ✅ Non-breaking for containerized deployments
- ✅ Explicit is better than implicit (Python Zen)
- ✅ Better developer experience (no surprises)
- ✅ Enables zero-config for simple apps

**Negative**:
- ⚠️ Templates must opt-in to show best practices
- ⚠️ Migration guide needed for v3.x users
- ⚠️ Slightly more verbose for users who want .env files

### Alternatives Considered

#### Alternative 1: Always Load .env
**Rejected** because:
- Breaks containerized deployments
- No way to disable for CI/CD
- Violates "explicit is better than implicit"

#### Alternative 2: Environment Variable Flag
**Rejected** because:
- Not discoverable (hidden in env vars)
- Harder to document
- Less TypeScript-friendly

#### Alternative 3: Auto-detect .env File Existence
**Rejected** because:
- Silent failures (file missing = no error)
- Unpredictable behavior
- Harder to debug

### Related Code

- `loadAndValidateEnvironment()` - Line 548-554 (opt-out check)
- `BootstrapOptions.envFileConfig` - Line 253 (optional interface)

### Migration Guide

**v3.x**:
```typescript
// Automatically loaded .env files
await bootstrap(App);
```

**v4.x**:
```typescript
// Opt-in to .env file loading
await bootstrap(App, {
  envFileConfig: {
    autoCreateTemplate: true
  }
});
```

---

## ADR-002: Port 0 Support for Testing

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

Parallel integration tests often fail with "port already in use" errors. CI/CD environments need dynamic port allocation to run multiple test suites concurrently.

**Problems**:
- Hard-coded ports cause conflicts in parallel tests
- CI/CD needs dynamic port assignment
- Express.js supports port 0 (OS-assigned), but it wasn't documented

### Decision

Allow `port: 0` to request OS-assigned port. Return the actual assigned port in the `IWebServerPublic` interface.

**Implementation**:
- Accept `port: 0` in `BootstrapOptions`
- Pass through to Express.js `listen(0)`
- Return actual port via `server.port` property

### Consequences

**Positive**:
- ✅ Enables parallel test execution
- ✅ No port conflicts in CI/CD
- ✅ Better testing patterns
- ✅ Leverages existing Express.js feature

**Negative**:
- ⚠️ Documentation must explain the pattern
- ⚠️ Users must read `server.port` to know actual port

### Alternatives Considered

#### Alternative 1: Auto-detect Available Ports
**Rejected** because:
- Complex implementation
- Race conditions possible
- Express.js already solves this with port 0

#### Alternative 2: Port Range Configuration
**Rejected** because:
- More complex API
- Still possible conflicts
- Port 0 is simpler and standard

### Related Code

- `determinePort()` - Line 710 (port resolution)
- `bootstrap()` - Line 862 (passes port to listen)
- Express.js `listen(0)` - OS-assigned port feature

### Example Usage

```typescript
const server = await bootstrap(App, { port: 0 });
console.log(`Listening on port: ${server.port}`); // e.g., 54321
```

---

## ADR-003: Multi-Environment Template Creation

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

When `autoCreateTemplate: true` and `files` mapping is provided, users expect templates for all mapped environments, not just the current one. This helps set up projects with all necessary `.env` files upfront.

**Problem**:
- Creating only current environment's file leaves others missing
- Users must manually create files for other environments
- Poor developer experience

### Decision

When `autoCreateTemplate: true` and `files` mapping exists, create templates for **ALL mapped environments**, not just the current one.

**Flow**:
1. If `autoCreateTemplate: true` AND `files` provided
2. Loop through all entries in `files` mapping
3. Create template for each missing file
4. Then load the file for current environment

### Consequences

**Positive**:
- ✅ Better project setup experience
- ✅ All environments ready from start
- ✅ Consistent file structure

**Negative**:
- ⚠️ Creates multiple files (may be unexpected)
- ⚠️ More file I/O operations

### Related Code

- `loadAndValidateEnvironment()` - Line 606-621 (multi-file creation)
- `createEnvTemplate()` - Line 436 (template creation)

### Example

```typescript
await bootstrap(App, {
  envFileConfig: {
    files: {
      development: ".env.dev",
      production: ".env.prod"
    },
    autoCreateTemplate: true
  }
});

// Creates BOTH .env.dev AND .env.prod (if missing)
```

---

## ADR-004: CI/CD Auto-Detection

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

CI/CD environments inject environment variables via platform secrets, not `.env` files. The framework should automatically detect CI environments and adjust behavior accordingly.

**Problem**:
- Manual `ciMode: true` configuration required
- Easy to forget in CI/CD pipelines
- Inconsistent behavior across platforms

### Decision

Auto-detect CI/CD environments by checking common environment variables. When detected:
- Skip .env file loading
- Validate `process.env` only
- Never create template files
- Provide platform-specific error hints

**Detection**:
- Generic: `process.env.CI`
- Platform-specific: `GITHUB_ACTIONS`, `GITLAB_CI`, `JENKINS_URL`, etc.

### Consequences

**Positive**:
- ✅ Zero-config for CI/CD
- ✅ Better error messages (platform-specific)
- ✅ Consistent behavior across platforms

**Negative**:
- ⚠️ Detection logic must be maintained
- ⚠️ Edge cases (custom CI platforms)

### Alternatives Considered

#### Alternative 1: Manual Configuration Only
**Rejected** because:
- Easy to forget
- Poor developer experience
- Inconsistent across projects

#### Alternative 2: Detect via Process Name
**Rejected** because:
- Less reliable
- Platform-dependent
- Harder to test

### Related Code

- `isCIEnvironment()` - Line 273 (CI detection)
- `detectCIPlatform()` - Line 295 (platform identification)
- `getPlatformHint()` - Line 315 (platform-specific hints)

---

## ADR-005: Separate File and Value Validation

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

Environment validation has two distinct concerns:
1. **File validation**: Does the `.env` file exist?
2. **Value validation**: Do variables have non-empty values?

These should be independently configurable.

### Decision

Separate validation into two options:
- `validateFile?: boolean` - Check if file exists
- `validateValues?: boolean` - Check if values are non-empty

**Defaults**:
- `validateFile`: `true` locally, `false` in CI
- `validateValues`: `true` in production/CI, `false` in development

**Special**: `required` array is always validated (even if `validateValues: false`)

### Consequences

**Positive**:
- ✅ Flexible validation strategy
- ✅ Better defaults per environment
- ✅ Clear separation of concerns

**Negative**:
- ⚠️ More options to understand
- ⚠️ Potential confusion (when to use which)

### Related Code

- `EnvironmentFileConfig` - Line 45 (interface definition)
- `loadAndValidateEnvironment()` - Line 597-699 (validation logic)

---

## ADR-006: Error Messages with Actionable Hints

**Date**: 2024-12-27  
**Status**: ✅ Accepted  
**Authors**: ExpressoTS Team

### Context

Generic error messages don't help developers fix issues quickly. Error messages should be actionable and include:
- Clear problem statement
- Specific solution steps
- Documentation links
- Debugging hints

### Decision

All custom errors follow this structure:
```
❌ Problem statement
💡 Actionable solution
📖 Documentation link
🔍 Debugging hints
```

**Examples**:
- `EnvFileNotFoundError`: Includes template content
- `CIEnvValidationError`: Platform-specific setup hints
- `EnvValidationError`: Variable names and example values

### Consequences

**Positive**:
- ✅ Faster problem resolution
- ✅ Better developer experience
- ✅ Reduced support burden

**Negative**:
- ⚠️ Longer error messages
- ⚠️ More maintenance (keep docs links updated)

### Related Code

- `EnvFileNotFoundError` - Line 346
- `CIEnvValidationError` - Line 368
- `EnvValidationError` - Line 398

---

## Template for New ADRs

When adding a new ADR, use this template:

```markdown
## ADR-XXX: [Title]

**Date**: YYYY-MM-DD  
**Status**: ✅ Accepted | 🚧 Proposed | ❌ Rejected  
**Authors**: [Names]

### Context

[Describe the issue or problem]

### Decision

[Describe the decision made]

### Consequences

**Positive**:
- ✅ [Benefit 1]
- ✅ [Benefit 2]

**Negative**:
- ⚠️ [Drawback 1]
- ⚠️ [Drawback 2]

### Alternatives Considered

#### Alternative 1: [Name]
**Rejected** because:
- [Reason]

### Related Code

- [File]:[Line] - [Description]

### Migration Guide

[If applicable]
```

---

## See Also

- [Architecture Guide](./architecture.md) - Implementation details
- [Bootstrap Public API](./bootstrap-public-api.md) - User-facing documentation

