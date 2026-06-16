# Event System Documentation

> 📚 **Comprehensive documentation for the ExpressoTS event system**

This directory contains multi-layered documentation for both framework users and developers.

---

## 📖 Documentation Structure

### For Application Developers (Public API)

- **[Event System Public API](./event-public-api.md)** - Complete event system documentation
  - Quick start guide
  - Type-safe event classes
  - Event handlers with auto-discovery
  - Conditional handlers
  - Priority-based execution
  - Event replay and flow tracking
  - API reference
  - Troubleshooting

### For Framework Developers

- **[Architecture Guide](./architecture.md)** - Internal implementation details
  - Event registry system
  - Handler discovery mechanism
  - Event emitter architecture
  - Flow tracking system
  - Extension points

### Examples

- **[Basic Event](./examples/basic-event.example.ts)** - Simple event and handler
- **[Conditional Handler](./examples/conditional-handler.example.ts)** - Conditional event handling
- **[Priority Execution](./examples/priority-execution.example.ts)** - Priority-based handler execution
- **[Event Replay](./examples/event-replay.example.ts)** - Event recording and replay

---

## 🚀 Quick Navigation

**I want to...**

- **Create events** → [Public API - Quick Start](./event-public-api.md#quick-start)
- **Create event handlers** → [Public API - Event Handlers](./event-public-api.md#event-handlers)
- **Use conditional handlers** → [Public API - Conditional Handlers](./event-public-api.md#conditional-handlers)
- **Track event flow** → [Public API - Event Flow Tracking](./event-public-api.md#event-flow-tracking)
- **Understand how it works** → [Architecture Guide](./architecture.md)
- **See code examples** → [Examples Directory](./examples/)

---

## 🎯 Documentation Philosophy

This documentation follows a **progressive disclosure** pattern:

1. **Beginner**: Start with basic events and handlers
2. **Intermediate**: Learn advanced patterns (conditionals, priorities, async)
3. **Advanced**: Understand architecture and extension points
4. **Expert**: Explore design decisions and customization

Each layer builds on the previous, allowing developers to dive as deep as they need.

---

## 📝 Contributing

When updating documentation:

1. **Public API changes** → Update `event-public-api.md`
2. **Implementation changes** → Update `architecture.md`
3. **New patterns** → Add example to `examples/`
4. **Complex flows** → Add diagram to `diagrams/`

---

## 🔗 Related Documentation

- [ExpressoTS Main Docs](https://doc.expresso-ts.com/)
- [Dependency Injection](../di/.docs/) - DI container
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization

---

## 💡 Key Concepts

- **Type-Safe Events**: Event classes (not strings!) with full type safety
- **Auto-Discovery**: Handlers automatically discovered via `@provide()` decorator
- **Conditional Handlers**: Handlers that run conditionally with `@When()`
- **Priority Execution**: Control handler execution order with priorities
- **Event Replay**: Record and replay events for debugging
- **Flow Tracking**: Visualize event flow and dependencies

---

## 📊 Documentation Coverage

- ✅ Public API - Complete
- ✅ Architecture - Complete
- ✅ Examples - 4 patterns covered
- ⏳ Diagrams - Pending

---

**Last Updated**: 2024-12-27

