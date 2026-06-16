/**
 * Container Introspector
 *
 * Builds a DI snapshot (bindings + summary + dependency graph) from an
 * ExpressoTS `AppContainer` and tracks which bindings are resolved during
 * each request via Inversify's middleware hook + AsyncLocalStorage.
 *
 * Designed to fail gracefully: if the container is missing, if it isn't
 * the expected ExpressoTS/Inversify shape, or if Reflect metadata is
 * unavailable, every method returns an empty result instead of throwing.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface InversifyBinding {
  implementationType?: { name?: string };
  scope?: string;
  type?: string;
  activated?: boolean;
  cache?: unknown;
  moduleId?: number | string | null;
}

interface InversifyContainer {
  id?: number;
  _bindingDictionary?: {
    _map?: Map<unknown, InversifyBinding[]>;
  };
  applyMiddleware?: (middleware: MiddlewareFactory) => void;
}

interface AppContainerLike {
  Container?: InversifyContainer;
  container?: InversifyContainer;
  introspect?: () => {
    options?: Record<string, unknown>;
    containerId?: number;
  };
}

interface ContainerIntrospection {
  options?: Record<string, unknown>;
  containerId?: number;
}

interface InjectMetadata {
  key?: string;
  value?: unknown;
}

type MiddlewareFactory = (
  planAndResolve: (args: { serviceIdentifier?: unknown }) => unknown,
) => (args: { serviceIdentifier?: unknown }) => unknown;

/** A single DI binding rendered as a node in the Studio Container view. */
export interface BindingNode {
  /** Unique node id (binding id or derived key). */
  id: string;
  /** Stringified service identifier the binding is registered under. */
  serviceIdentifier: string;
  /** Implementation class name, when resolvable. */
  className: string;
  /** Binding scope (e.g. "Singleton", "Transient", "Request"). */
  scope: string;
  /** Binding type (e.g. "Instance", "ConstantValue", "Factory"). */
  type: string;
  /** Whether the binding's activation hook has run. */
  activated: boolean;
  /** Whether a cached instance exists (singletons after first resolve). */
  cached: boolean;
  /** Id of the container module that registered the binding, if any. */
  moduleId?: number | string | null;
}

/** A dependency edge between two bindings (source depends on target). */
export interface BindingEdge {
  source: string;
  target: string;
}

/**
 * Point-in-time view of the DI container: all bindings, the dependency
 * edges between them, and aggregate counts for the summary header.
 */
export interface ContainerSnapshot {
  bindings: BindingNode[];
  edges: BindingEdge[];
  summary: {
    total: number;
    byScope: Record<string, number>;
    byType: Record<string, number>;
    cached: number;
    activated: number;
  };
  options?: Record<string, unknown>;
  timestamp: string;
  containerId: number;
}

// Per-request store: tracks the set of resolved service identifiers and the
// optional traceId associated with the in-flight request.
interface RequestContext {
  traceId?: string;
  resolved: Set<string>;
}

/** Reflect metadata keys used by Inversify (vendored copy in @expressots/core). */
const INVERSIFY_TAGGED = 'inversify:tagged';
const INVERSIFY_TAGGED_PROPS = 'inversify:tagged_props';

/**
 * Typed view of `Reflect.getMetadata` (provided by `reflect-metadata` which
 * `inversify` already loads — but our local `tsconfig` doesn't pull in those
 * type declarations, so we cast through `any` for compile time).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReflectAny: any = Reflect;

/**
 * Inspects an ExpressoTS `AppContainer` for the Studio Container view.
 *
 * Produces a `ContainerSnapshot` (bindings, dependency edges, summary)
 * and, via `installResolutionTracker()` and `runWithRequest()`, records
 * which bindings each HTTP request resolves. All methods fail soft:
 * when the container is missing or not the expected Inversify shape,
 * they return empty results instead of throwing.
 */
export class ContainerIntrospector {
  private appContainer: AppContainerLike | null;
  private als: AsyncLocalStorage<RequestContext>;
  private snapshot: ContainerSnapshot | null = null;

  /**
   * @param appContainer - The host's ExpressoTS `AppContainer` (or any
   *   object exposing the underlying Inversify container).
   */
  constructor(appContainer: unknown) {
    this.appContainer =
      appContainer && typeof appContainer === 'object'
        ? (appContainer as AppContainerLike)
        : null;
    this.als = new AsyncLocalStorage<RequestContext>();
  }

  /** Whether we have a usable AppContainer / Inversify container reference. */
  isAvailable(): boolean {
    if (!this.appContainer) return false;
    const inversify = this.getInversifyContainer();
    return Boolean(inversify);
  }

  /** Builds the snapshot once and caches it. */
  capture(): ContainerSnapshot {
    if (this.snapshot) return this.snapshot;
    return this.buildSnapshot();
  }

  /**
   * Invalidates the cached snapshot and re-scans. Use after the host
   * finishes registering all bindings (e.g. post-`configureServices()`).
   */
  recapture(): ContainerSnapshot {
    this.snapshot = null;
    return this.buildSnapshot();
  }

  private buildSnapshot(): ContainerSnapshot {

    const inversify = this.getInversifyContainer();
    if (!inversify) {
      this.snapshot = this.emptySnapshot();
      return this.snapshot;
    }

    let introspection: ContainerIntrospection | null = null;
    try {
      introspection = typeof this.appContainer?.introspect === 'function'
        ? this.appContainer.introspect()
        : null;
    } catch {
      introspection = null;
    }

    const { nodes, edges } = this.scanBindings(inversify);
    const summary = this.computeSummary(nodes);

    this.snapshot = {
      bindings: nodes,
      edges,
      summary,
      options: introspection?.options ?? {},
      timestamp: new Date().toISOString(),
      containerId: introspection?.containerId ?? inversify?.id ?? -1,
    };
    return this.snapshot;
  }

  /**
   * Installs an Inversify middleware that records every `container.get(...)`
   * resolution into the active request's resolved-set. Safe to call once.
   */
  installResolutionTracker(): void {
    const inversify = this.getInversifyContainer();
    if (!inversify || typeof inversify.applyMiddleware !== 'function') {
      return;
    }

    const als = this.als;
    const trackingMiddleware: MiddlewareFactory = (planAndResolve) => (args) => {
      const ctx = als.getStore();
      if (ctx) {
        try {
          ctx.resolved.add(this.formatServiceIdentifier(args?.serviceIdentifier));
        } catch {
          // Tracking is best-effort; never break resolution.
        }
      }
      return planAndResolve(args);
    };

    try {
      inversify.applyMiddleware(trackingMiddleware);
    } catch {
      // Older Inversify versions or wrapped containers may not allow this.
      // Failing to track per-request resolutions is non-fatal.
    }
  }

  /**
   * Runs `fn` inside a request scope so resolutions get attributed to a
   * traceId. Returns the set of resolved service identifiers when the
   * callback completes.
   */
  runWithRequest<T>(traceId: string | undefined, fn: () => T): {
    result: T;
    resolved: Set<string>;
  } {
    const ctx: RequestContext = { traceId, resolved: new Set<string>() };
    const result = this.als.run(ctx, fn);
    return { result, resolved: ctx.resolved };
  }

  /** Get the current request context (or undefined when not in a request). */
  getCurrentRequest(): RequestContext | undefined {
    return this.als.getStore();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────────

  private getInversifyContainer(): InversifyContainer | null {
    if (!this.appContainer) return null;
    // ExpressoTS AppContainer exposes `Container` as the inversify instance.
    const inv =
      this.appContainer.Container ??
      this.appContainer.container ??
      (this.appContainer as InversifyContainer);
    if (!inv) return null;
    if (!inv._bindingDictionary) return null;
    return inv;
  }

  private scanBindings(inversify: InversifyContainer): {
    nodes: BindingNode[];
    edges: BindingEdge[];
  } {
    const nodes: BindingNode[] = [];
    const edges: BindingEdge[] = [];

    const dict = inversify._bindingDictionary;
    const map: Map<unknown, InversifyBinding[]> | undefined = dict?._map;
    if (!map) return { nodes, edges };

    // First pass: build all nodes so we know which service identifiers exist.
    const sidToNodeId = new Map<string, string>();
    for (const [sid, bindings] of map) {
      for (const binding of bindings) {
        const sidStr = this.formatServiceIdentifier(sid);
        const impl = binding?.implementationType;
        const className = (impl && impl.name) || sidStr;
        // Unique id per binding (multiple bindings may share an identifier).
        const id = `${sidStr}#${nodes.length}`;
        nodes.push({
          id,
          serviceIdentifier: sidStr,
          className,
          scope: String(binding?.scope ?? 'Singleton'),
          type: String(binding?.type ?? 'Instance'),
          activated: Boolean(binding?.activated),
          cached: binding?.cache !== null && binding?.cache !== undefined,
          moduleId: binding?.moduleId ?? null,
        });
        if (!sidToNodeId.has(sidStr)) {
          sidToNodeId.set(sidStr, id);
        }
      }
    }

    // Second pass: emit edges using inversify's tagged-paramtypes metadata.
    for (const [sid, bindings] of map) {
      for (const binding of bindings) {
        const impl = binding?.implementationType;
        if (!impl) continue;
        const sidStr = this.formatServiceIdentifier(sid);
        const sourceId = sidToNodeId.get(sidStr);
        if (!sourceId) continue;

        const deps = this.getConstructorDependencies(impl);
        for (const depSid of deps) {
          const targetId = sidToNodeId.get(depSid);
          if (targetId) {
            edges.push({ source: sourceId, target: targetId });
          }
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Reads inversify's constructor-injection metadata and returns the list of
   * service identifiers each constructor parameter depends on.
   */
  private getConstructorDependencies(impl: { name?: string }): string[] {
    const out: string[] = [];
    if (!impl) return out;

    // Inversify stores `@inject(SID)` constructor params under "inversify:tagged"
    // keyed by the prototype + index. The simpler `inversify:paramtypes` key on
    // the prototype gives the TS design types — useful as a fallback.
    const tagged: Map<number, InjectMetadata[]> | undefined =
      ReflectAny.getMetadata?.(INVERSIFY_TAGGED, impl);

    if (tagged && typeof tagged.forEach === 'function') {
      tagged.forEach((metadataList: InjectMetadata[]) => {
        for (const m of metadataList || []) {
          if (m?.key === 'inject' && m?.value !== undefined) {
            out.push(this.formatServiceIdentifier(m.value));
          }
        }
      });
    }

    // Property-injected dependencies via @inject() on properties.
    const taggedProps: Record<string, InjectMetadata[]> | undefined =
      ReflectAny.getMetadata?.(INVERSIFY_TAGGED_PROPS, impl);
    if (taggedProps && typeof taggedProps === 'object') {
      for (const propKey of Object.keys(taggedProps)) {
        for (const m of taggedProps[propKey] || []) {
          if (m?.key === 'inject' && m?.value !== undefined) {
            out.push(this.formatServiceIdentifier(m.value));
          }
        }
      }
    }

    return out;
  }

  private computeSummary(nodes: BindingNode[]): ContainerSnapshot['summary'] {
    const byScope: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let cached = 0;
    let activated = 0;
    for (const n of nodes) {
      byScope[n.scope] = (byScope[n.scope] ?? 0) + 1;
      byType[n.type] = (byType[n.type] ?? 0) + 1;
      if (n.cached) cached++;
      if (n.activated) activated++;
    }
    return { total: nodes.length, byScope, byType, cached, activated };
  }

  private formatServiceIdentifier(sid: unknown): string {
    if (sid == null) return 'unknown';
    if (typeof sid === 'string') return sid;
    if (typeof sid === 'symbol') return sid.toString();
    if (typeof sid === 'function') return sid.name || sid.toString();
    return String(sid);
  }

  private emptySnapshot(): ContainerSnapshot {
    return {
      bindings: [],
      edges: [],
      summary: { total: 0, byScope: {}, byType: {}, cached: 0, activated: 0 },
      options: {},
      timestamp: new Date().toISOString(),
      containerId: -1,
    };
  }
}
