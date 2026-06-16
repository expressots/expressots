# Testing Documentation

> 📚 **Comprehensive documentation for the ExpressoTS testing utilities**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Testing Public API](./testing-public-api.md)** - Complete testing documentation
  - Quick start guide
  - Creating test applications
  - Fluent request builder
  - Mock providers
  - Snapshot testing
  - Load testing
  - Database testing
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Test app factory
  - Request builder system
  - Mock provider system
  - Testing utilities
  - Extension points

### Examples

- **[Basic Test](./examples/basic-test.example.ts)** - Simple test setup
- **[Mock Providers](./examples/mock-providers.example.ts)** - Using mock providers
- **[Fluent Requests](./examples/fluent-requests.example.ts)** - Fluent request builder
- **[Load Testing](./examples/load-testing.example.ts)** - Load testing examples

---

## 🚀 Quick Navigation

**I want to...**

- **Set up tests** → [Public API - Quick Start](./testing-public-api.md#quick-start)
- **Use fluent requests** → [Public API - Fluent Requests](./testing-public-api.md#fluent-requests)
- **Mock providers** → [Public API - Mock Providers](./testing-public-api.md#mock-providers)
- **Load test** → [Public API - Load Testing](./testing-public-api.md#load-testing)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic test setup
2. **Intermediate**: Learn advanced patterns (mocks, fluent requests)
3. **Advanced**: Understand architecture and extension points
4. **Expert**: Explore design decisions and customization

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `testing-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`
4. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application setup
- [Dependency Injection](../di/.docs/) - DI container

---

## 💡 Key Concepts

- **Zero-Config Testing**: Minimal setup required
- **Fluent API**: Chainable request builder
- **Mock Providers**: Easy provider mocking
- **Snapshot Testing**: Test response snapshots
- **Load Testing**: Built-in load testing utilities
- **Database Testing**: Test database utilities

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 4 patterns covered
- ⏳ Diagrams - Pending

---

**Last Updated**: 2024-12-27

