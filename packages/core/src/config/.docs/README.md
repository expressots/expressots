# Configuration System Documentation

> 📚 **Comprehensive documentation for the ExpressoTS configuration system**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Configuration Public API](./config-public-api.md)** - Complete configuration documentation
  - Quick start guide
  - Type-safe configuration with full TypeScript inference
  - Environment variable management
  - Secret handling with auto-redaction
  - Multi-environment defaults
  - Validation and error messages
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Configuration resolver architecture
  - Field builder system
  - Secret value wrapper
  - Validation system
  - Error formatting

### Examples

- **[Basic Configuration](./examples/basic-config.example.ts)** - Simple configuration setup
- **[Multi-Environment Config](./examples/multi-env-config.example.ts)** - Environment-specific defaults
- **[Secret Management](./examples/secret-management.example.ts)** - Handling sensitive values
- **[Validation](./examples/validation.example.ts)** - Field validation and error handling

---

## 🚀 Quick Navigation

**I want to...**

- **Set up configuration** → [Public API - Quick Start](./config-public-api.md#quick-start)
- **Handle secrets safely** → [Public API - Secret Management](./config-public-api.md#secret-management)
- **Use environment-specific defaults** → [Public API - Multi-Environment](./config-public-api.md#multi-environment-defaults)
- **Validate configuration** → [Public API - Validation](./config-public-api.md#validation)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic configuration examples
2. **Intermediate**: Learn advanced patterns (secrets, validation, multi-env)
3. **Advanced**: Understand architecture and extension points
4. **Expert**: Explore design decisions and customization

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `config-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`
4. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization
- [Environment Variables](../application/.docs/bootstrap-public-api.md#environment-files)

---

## 💡 Key Concepts

- **Type-Safe Configuration**: Full TypeScript inference, no type casting needed
- **Secret Management**: Auto-redacted values with safe comparison
- **Multi-Environment**: Different defaults per environment (dev, staging, prod)
- **Helpful Errors**: Validation errors with examples and hints
- **Zero Config**: Sensible defaults for all field types

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 4 patterns covered
- ⏳ Diagrams - Pending

---

**Last Updated**: 2024-12-27

