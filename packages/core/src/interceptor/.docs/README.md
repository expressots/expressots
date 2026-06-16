# Interceptor System Documentation

> 📚 **Comprehensive documentation for the ExpressoTS interceptor system**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Interceptor Public API](./interceptor-public-api.md)** - Complete interceptor documentation
  - Quick start guide
  - Creating interceptors
  - Execution context
  - Conditional interceptors
  - Interceptor composition
  - Built-in interceptors
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Interceptor registry system
  - Execution pipeline
  - Context management
  - Extension points

### Examples

- **[Basic Interceptor](./examples/basic-interceptor.example.ts)** - Simple logging interceptor
- **[Conditional Interceptor](./examples/conditional-interceptor.example.ts)** - Conditional execution
- **[Composed Interceptor](./examples/composed-interceptor.example.ts)** - Multiple interceptors
- **[Performance Interceptor](./examples/performance-interceptor.example.ts)** - Performance monitoring

---

## 🚀 Quick Navigation

**I want to...**

- **Create interceptors** → [Public API - Quick Start](./interceptor-public-api.md#quick-start)
- **Use execution context** → [Public API - Execution Context](./interceptor-public-api.md#execution-context)
- **Create conditional interceptors** → [Public API - Conditional Interceptors](./interceptor-public-api.md#conditional-interceptors)
- **Compose interceptors** → [Public API - Interceptor Composition](./interceptor-public-api.md#interceptor-composition)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic interceptors
2. **Intermediate**: Learn advanced patterns (conditionals, composition)
3. **Advanced**: Understand architecture and extension points
4. **Expert**: Explore design decisions and customization

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `interceptor-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`
4. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [Dependency Injection](../di/.docs/) - DI container
- [Middleware](../middleware/.docs/) - Middleware system

---

## 💡 Key Concepts

- **AOP Pattern**: Aspect-Oriented Programming for cross-cutting concerns
- **Pipeline Execution**: Interceptors wrap each other in a pipeline
- **Execution Context**: Access to request, response, and container
- **Priority System**: Control execution order with priorities
- **Conditional Execution**: Run interceptors conditionally
- **Composition**: Combine multiple interceptors

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 4 patterns covered
- ⏳ Diagrams - Pending

---

**Last Updated**: 2024-12-27

