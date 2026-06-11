/**
 * Database Introspector
 *
 * Builds a read-only snapshot of the ExpressoTS in-memory database
 * (`InMemoryDBProvider`) for the Studio "Database" view: entity schemas
 * (fields, relations, indexes), per-table record counts, and paginated
 * row data.
 *
 * Designed to fail gracefully: if no `InMemoryDBProvider` is registered,
 * if the container isn't the expected Inversify shape, or if the provider
 * doesn't expose the expected API, every method returns an "unavailable"
 * result instead of throwing. The agent never imports `@expressots/core`
 * directly — the provider is duck-typed so the agent stays decoupled.
 */

import type {
  DatabaseSnapshot,
  DatabaseEntitySchema,
  DatabaseFieldSchema,
  DatabaseRelationSchema,
  DatabaseTableData,
} from '../types/index.js';

/** Reflect metadata keys used by the in-memory DB schema decorators. */
const DB_METADATA_KEYS = {
  entity: 'expressots:db:entity',
  primaryKey: 'expressots:db:primaryKey',
  index: 'expressots:db:index',
  unique: 'expressots:db:unique',
  autoGenerate: 'expressots:db:autoGenerate',
  default: 'expressots:db:default',
  relation: 'expressots:db:relation',
  nullable: 'expressots:db:nullable',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReflectAny: any = Reflect;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

const FIELD_SAMPLE_SIZE = 50;

/**
 * Read-only introspector for the ExpressoTS in-memory database, powering
 * the Studio "Database" view.
 *
 * Resolves an `InMemoryDBProvider` from the host's DI container by duck
 * typing (the agent never imports `@expressots/core`) and exposes entity
 * schemas, record counts, and paginated row data. Every method fails
 * soft: when no provider is registered or the shapes don't match, an
 * "unavailable" or empty result is returned instead of an error.
 */
export class DatabaseIntrospector {
  private appContainer: AnyObj;
  private provider: AnyObj | null = null;
  private resolved = false;

  /**
   * @param appContainer - The host's ExpressoTS `AppContainer` (or any
   *   object exposing the underlying Inversify container).
   */
  constructor(appContainer: unknown) {
    this.appContainer = appContainer;
  }

  /** Whether an InMemoryDBProvider could be resolved from the container. */
  isAvailable(): boolean {
    return this.getProvider() !== null;
  }

  /**
   * Build a schema snapshot of every table in the in-memory database.
   * Returns `{ available: false }` when no provider is registered.
   */
  capture(): DatabaseSnapshot {
    const provider = this.getProvider();
    if (!provider) return this.emptySnapshot();

    try {
      const db = provider.getDatabase?.();
      const tables: Map<string, AnyObj> | undefined = db?.tables;

      const entities: DatabaseEntitySchema[] = [];
      let totalRecords = 0;

      if (tables && typeof tables.forEach === 'function') {
        for (const [name, adapter] of tables) {
          const entity = this.buildEntitySchema(name, adapter);
          entities.push(entity);
          totalRecords += entity.recordCount;
        }
      }

      return {
        available: true,
        tableCount: entities.length,
        totalRecords,
        entities,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return this.emptySnapshot();
    }
  }

  /**
   * Return a page of rows from a single table.
   * Returns an empty page when the provider or table is unavailable.
   */
  async getTableData(
    table: string,
    offset = 0,
    limit = 50,
  ): Promise<DatabaseTableData> {
    const empty: DatabaseTableData = {
      table,
      rows: [],
      total: 0,
      offset,
      limit,
    };

    const provider = this.getProvider();
    if (!provider) return empty;

    try {
      const adapter = provider.table?.(table);
      if (!adapter) return empty;

      const total: number = await adapter.count();
      const rows: Array<Record<string, unknown>> = await adapter.findMany({
        skip: offset,
        take: limit,
      });

      return { table, rows, total, offset, limit };
    } catch {
      return empty;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────────

  /** Resolve and cache the InMemoryDBProvider instance from the container. */
  private getProvider(): AnyObj | null {
    if (this.resolved) return this.provider;
    this.resolved = true;

    const inversify = this.getInversifyContainer();
    if (!inversify) {
      this.provider = null;
      return null;
    }

    try {
      const dict = inversify._bindingDictionary;
      const map: Map<unknown, AnyObj[]> | undefined = dict?._map;
      if (!map) {
        this.provider = null;
        return null;
      }

      for (const [sid, bindings] of map) {
        // Match on the service identifier name as well as the
        // implementationType. Dynamic-value / factory / constant bindings
        // (`bind(P).toDynamicValue(...)`) carry no `implementationType`, so
        // matching only on it would miss those registrations — the service
        // identifier (the provider class) is the reliable signal.
        const sidName = this.identifierName(sid);
        for (const binding of bindings) {
          const implName = binding?.implementationType?.name;
          if (
            sidName === 'InMemoryDBProvider' ||
            implName === 'InMemoryDBProvider'
          ) {
            const instance = this.tryResolve(inversify, sid);
            if (this.looksLikeProvider(instance)) {
              this.provider = instance;
              return this.provider;
            }
          }
        }
      }
    } catch {
      // fall through to null
    }

    this.provider = null;
    return null;
  }

  /** Best-effort container resolution that never throws. */
  private tryResolve(inversify: AnyObj, sid: unknown): AnyObj | null {
    try {
      return inversify.get(sid);
    } catch {
      return null;
    }
  }

  /** Readable name for a service identifier (class, string, or symbol). */
  private identifierName(sid: unknown): string {
    if (typeof sid === 'function') return (sid as { name?: string }).name ?? '';
    if (typeof sid === 'string') return sid;
    if (typeof sid === 'symbol') return sid.description ?? sid.toString();
    return '';
  }

  /** Duck-type check for the InMemoryDBProvider public API. */
  private looksLikeProvider(candidate: unknown): boolean {
    if (!candidate || typeof candidate !== 'object') return false;
    const obj = candidate as Record<string, unknown>;
    return (
      typeof obj.getDatabase === 'function' &&
      typeof obj.getStats === 'function' &&
      typeof obj.table === 'function'
    );
  }

  private getInversifyContainer(): AnyObj | null {
    if (!this.appContainer) return null;
    const inv =
      this.appContainer.Container ??
      this.appContainer.container ??
      this.appContainer;
    if (!inv) return null;
    if (!inv._bindingDictionary) return null;
    return inv;
  }

  /** Build the schema for a single table from its adapter + entity metadata. */
  private buildEntitySchema(
    name: string,
    adapter: AnyObj,
  ): DatabaseEntitySchema {
    const stats = this.safeStats(adapter);
    const entityClass = adapter?.entityClass;

    const fields = this.buildFields(entityClass, adapter, stats.indexes);
    const relations = this.buildRelations(entityClass);

    let timestamps = true;
    let softDelete = false;
    if (entityClass) {
      const meta = ReflectAny.getMetadata?.(
        DB_METADATA_KEYS.entity,
        entityClass,
      );
      if (meta) {
        timestamps = Boolean(meta.timestamps);
        softDelete = Boolean(meta.softDelete);
      }
    }

    return {
      name,
      timestamps,
      softDelete,
      fields,
      relations,
      recordCount: stats.recordCount,
      indexes: stats.indexes,
      memoryEstimate: stats.memoryEstimate,
    };
  }

  private safeStats(adapter: AnyObj): {
    recordCount: number;
    indexes: Array<{ field: string; size: number; unique: boolean }>;
    memoryEstimate: number;
  } {
    try {
      const stats = adapter?.getStats?.();
      if (stats) {
        return {
          recordCount: Number(stats.recordCount) || 0,
          indexes: Array.isArray(stats.indexes) ? stats.indexes : [],
          memoryEstimate: Number(stats.memoryEstimate) || 0,
        };
      }
    } catch {
      // ignore
    }
    return { recordCount: 0, indexes: [], memoryEstimate: 0 };
  }

  /**
   * Build the field list. Prefers decorator metadata, then supplements with
   * keys discovered by sampling stored rows (so undecorated fields appear).
   */
  private buildFields(
    entityClass: AnyObj,
    adapter: AnyObj,
    indexes: Array<{ field: string; unique: boolean }>,
  ): DatabaseFieldSchema[] {
    const primaryKeys = new Set<string>();
    const uniqueFields = new Set<string>();
    const indexedFields = new Set<string>();
    const nullableFields = new Set<string>();
    const autoGenerate: Record<string, string> = {};

    for (const idx of indexes) {
      indexedFields.add(idx.field);
      if (idx.unique) uniqueFields.add(idx.field);
    }

    if (entityClass) {
      for (const pk of this.metaArray(entityClass, DB_METADATA_KEYS.primaryKey)) {
        primaryKeys.add(String(pk));
      }
      for (const u of this.metaArray(entityClass, DB_METADATA_KEYS.unique)) {
        uniqueFields.add(String(u));
      }
      for (const n of this.metaArray(entityClass, DB_METADATA_KEYS.nullable)) {
        nullableFields.add(String(n));
      }
      for (const idx of this.metaArray(entityClass, DB_METADATA_KEYS.index)) {
        if (idx && idx.field) indexedFields.add(String(idx.field));
      }
      const auto =
        ReflectAny.getMetadata?.(DB_METADATA_KEYS.autoGenerate, entityClass) ||
        {};
      for (const [field, strategy] of Object.entries(auto)) {
        autoGenerate[field] = String(strategy);
      }
    }

    // Discover field names: decorated fields + sampled row keys.
    const fieldNames = new Set<string>([
      ...primaryKeys,
      ...uniqueFields,
      ...indexedFields,
      ...nullableFields,
      ...Object.keys(autoGenerate),
    ]);

    for (const key of this.sampleRowKeys(adapter)) {
      fieldNames.add(key);
    }

    // Ensure id is always present and ordered first.
    fieldNames.add('id');
    const ordered = ['id', ...[...fieldNames].filter((f) => f !== 'id').sort()];

    return ordered.map((field) => ({
      name: field,
      isPrimaryKey: primaryKeys.has(field) || field === 'id',
      isUnique: uniqueFields.has(field),
      isIndexed: indexedFields.has(field),
      isNullable: nullableFields.has(field),
      autoGenerate: autoGenerate[field],
    }));
  }

  private buildRelations(entityClass: AnyObj): DatabaseRelationSchema[] {
    if (!entityClass) return [];

    const relations = this.metaArray(entityClass, DB_METADATA_KEYS.relation);
    return relations.map((rel: AnyObj) => ({
      field: String(rel.field),
      type: rel.type,
      target: this.resolveTargetName(rel.target),
      foreignKey: rel.foreignKey || undefined,
      through: rel.through || undefined,
    }));
  }

  /** Resolve a relation target factory `() => Class` to a readable name. */
  private resolveTargetName(targetFactory: unknown): string {
    try {
      if (typeof targetFactory === 'function') {
        const target = (targetFactory as () => AnyObj)();
        if (target) {
          const meta = ReflectAny.getMetadata?.(
            DB_METADATA_KEYS.entity,
            target,
          );
          if (meta?.name) return String(meta.name);
          if (target.name) return String(target.name);
        }
      }
    } catch {
      // ignore
    }
    return 'unknown';
  }

  /** Sample stored row keys synchronously via the adapter's MemoryStore. */
  private sampleRowKeys(adapter: AnyObj): string[] {
    try {
      const store = adapter?.store;
      const rows: AnyObj[] =
        typeof store?.findAll === 'function' ? store.findAll() : [];
      const keys = new Set<string>();
      for (const row of rows.slice(0, FIELD_SAMPLE_SIZE)) {
        if (row && typeof row === 'object') {
          for (const key of Object.keys(row)) keys.add(key);
        }
      }
      return [...keys];
    } catch {
      return [];
    }
  }

  private metaArray(target: AnyObj, key: string): AnyObj[] {
    const value = ReflectAny.getMetadata?.(key, target);
    return Array.isArray(value) ? value : [];
  }

  private emptySnapshot(): DatabaseSnapshot {
    return {
      available: false,
      tableCount: 0,
      totalRecords: 0,
      entities: [],
      timestamp: new Date().toISOString(),
    };
  }
}
