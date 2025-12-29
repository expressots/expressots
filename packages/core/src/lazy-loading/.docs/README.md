# Lazy Loading Documentation

> 📚 **Comprehensive documentation for the ExpressoTS lazy loading system**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Lazy Loading Public API](./lazy-loading-public-api.md)** - Complete lazy loading documentation
  - Quick start guide
  - Creating lazy modules
  - Preload hints
  - Module status tracking
  - Usage analytics
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Lazy module loader
  - Module manager
  - Warmup system
  - Metrics collection
  - Extension points

### Examples

- **[Basic Lazy Module](./examples/basic-lazy-module.example.ts)** - Simple lazy module
- **[Preload Hints](./examples/preload-hints.example.ts)** - Using preload hints
- **[Module Warmup](./examples/module-warmup.example.ts)** - Background warmup
- **[Usage Analytics](./examples/usage-analytics.example.ts)** - Tracking module usage

---

## 🚀 Quick Navigation

**I want to...**

- **Create lazy modules** → [Public API - Quick Start](./lazy-loading-public-api.md#quick-start)
- **Use preload hints** → [Public API - Preload Hints](./lazy-loading-public-api.md#preload-hints)
- **Track module usage** → [Public API - Usage Analytics](./lazy-loading-public-api.md#usage-analytics)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic lazy modules
2. **Intermediate**: Learn advanced patterns (preload hints, warmup)
3. **Advanced**: Understand architecture and extension points
4. **Expert**: Explore design decisions and customization

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `lazy-loading-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`
4. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [Dependency Injection](../di/.docs/) - DI container
- [Container Module](../container-module/.docs/) - Container modules

---

## 💡 Key Concepts

- **On-Demand Loading**: Load modules only when needed
- **Preload Hints**: Suggest when to preload modules
- **Usage Analytics**: Track module usage patterns
- **Progressive Loading**: Load modules in phases
- **Background Warmup**: Warm up modules during idle time
- **Status Tracking**: Monitor module load status

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 4 patterns covered
- ⏳ Diagrams - Pending

---

**Last Updated**: 2024-12-27

