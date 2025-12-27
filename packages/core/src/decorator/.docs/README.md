# Scope Binding Decorators Documentation

> 📚 **Comprehensive documentation for the ExpressoTS scope binding decorators**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Decorator Public API](./decorator-public-api.md)** - Complete user-facing documentation
  - Quick start guide
  - Progressive enhancement patterns
  - Real-world scenarios
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Component breakdown
  - Metadata storage
  - Scope resolution
  - Extension points

### Examples

- **[Basic Provide](./examples/basic-provide.example.ts)** - Simple service registration
- **[Custom Scope](./examples/custom-scope.example.ts)** - Tenant-scoped service

---

## 🚀 Quick Navigation

**I want to...**

- **Register a service** → [Public API - Quick Start](./decorator-public-api.md#quick-start)
- **Use custom scope** → [Public API - Custom Scope](./decorator-public-api.md#level-3-custom-scope)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic `provide()` decorator
2. **Intermediate**: Learn different scopes
3. **Advanced**: Understand custom scopes and metadata
4. **Expert**: Explore architecture and extension points

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `decorator-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`

---

## 🔗 Related Documentation

- [AppContainer](../application/.docs/app-container-public-api.md) - Using services with container
- [Container Module](../container-module/.docs/container-module-public-api.md) - Module creation
- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 2 patterns covered

---

**Last Updated**: 2024-12-27

