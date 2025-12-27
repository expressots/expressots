/**
 * Adapter Module Exports
 * @module db-in-memory/adapter
 */

export {
  IDataAdapter,
  ITableAdapter,
  IMultiTableAdapter,
  IReactiveDataAdapter,
  ISubscription,
  ChangeEvent,
  ChangeType,
} from "./adapter.interface";

export {
  InMemoryAdapter,
  InMemoryAdapterOptions,
  InMemoryDatabase,
  InMemoryDatabaseOptions,
} from "./in-memory.adapter";

