# Application Bootstrap Documentation

> 📚 **Comprehensive documentation for the ExpressoTS application bootstrap system**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Bootstrap Public API](./bootstrap-public-api.md)** - Complete bootstrap documentation
  - Quick start guide
  - Progressive enhancement patterns
  - Real-world scenarios
  - API reference
  - Troubleshooting

- **[AppFactory Public API](./app-factory-public-api.md)** - Factory class documentation
  - When to use directly
  - Comparison with bootstrap()
  - Advanced use cases

- **[AppContainer Public API](./app-container-public-api.md)** - Dependency injection container
  - Container setup
  - Binding scopes
  - Debugging utilities
  - Real-world scenarios

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Bootstrap architecture
  - AppFactory architecture
  - AppContainer architecture
  - Component relationships
  - Performance characteristics
  - Extension points

- **[Decision Log](./decision-log.md)** - Architecture Decision Records (ADRs)
  - Why decisions were made
  - Alternatives considered
  - Migration guides

### Examples

**Bootstrap Examples:**
- **[Basic Bootstrap](./examples/basic-bootstrap.example.ts)** - Zero-config startup
- **[Advanced Bootstrap](./examples/advanced-bootstrap.example.ts)** - Production-ready config
- **[Testing Bootstrap](./examples/testing-bootstrap.example.ts)** - Dynamic ports for tests
- **[CI/CD Bootstrap](./examples/ci-cd-bootstrap.example.ts)** - Containerized deployments

**Other Examples:**
- **[AppFactory](./examples/app-factory.example.ts)** - Direct factory usage
- **[AppContainer](./examples/app-container.example.ts)** - Container setup

### Visual Diagrams

- **[Bootstrap Flow](./diagrams/bootstrap-flow.mermaid)** - Complete startup sequence
- **[Environment Loading Decision Tree](./diagrams/env-loading-decision-tree.mermaid)** - .env file logic

---

## 🚀 Quick Navigation

**I want to...**

- **Start my app** → [Bootstrap Public API - Quick Start](./bootstrap-public-api.md#quick-start)
- **Configure environment files** → [Bootstrap Public API - Environment Files](./bootstrap-public-api.md#level-2-environment-files)
- **Use dependency injection** → [AppContainer Public API](./app-container-public-api.md)
- **Create app instances manually** → [AppFactory Public API](./app-factory-public-api.md)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)
- **Know why something is designed that way** → [Decision Log](./decision-log.md)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with quick examples
2. **Intermediate**: Learn configuration options
3. **Advanced**: Understand architecture
4. **Expert**: Explore design decisions

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `bootstrap-public-api.md` (or corresponding `*-public-api.md`)
2. **Implementation changes** → Update `architecture.md`
3. **Design decisions** → Add ADR to `decision-log.md`
4. **New patterns** → Add example to `examples/`
5. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [CLI Documentation](https://doc.expresso-ts.com/docs/cli/overview)
- [First Steps Guide](https://doc.expresso-ts.com/docs/overview/first-steps)

---

## 📊 Documentation Coverage

- ✅ Bootstrap Public API - Complete
- ✅ AppFactory Public API - Complete
- ✅ AppContainer Public API - Complete
- ✅ Architecture - Complete (Bootstrap, AppFactory, AppContainer)
- ✅ Decision Log - 6 ADRs documented
- ✅ Examples - 6 patterns covered (4 bootstrap + 2 others)
- ✅ Diagrams - 2 flowcharts

---

**Last Updated**: 2024-12-27

