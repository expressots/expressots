/**
 * Container introspection helpers.
 *
 * Centralises the (currently unavoidable) reach into the vendored
 * Inversify `_bindingDictionary._map`. Concentrating it in one file means
 * the rest of the framework no longer accesses Inversify internals
 * directly, and the day we replace or upgrade the DI internals there is
 * exactly one file to update.
 *
 * @public API (advanced) - intentionally exported so user code, the
 * adapter, and the metrics collector can introspect bindings without
 * each importing private internals.
 */
import type { interfaces } from "./inversify.js";

/**
 * Visit every binding in the container, including duplicates registered
 * for the same service identifier. Returns the total count visited.
 */
export function forEachBinding(
  container: interfaces.Container,
  visit: (
    binding: interfaces.Binding<unknown>,
    serviceIdentifier: unknown,
  ) => void,
): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dict = (container as any)._bindingDictionary;
  if (!dict) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = dict._map as Map<unknown, Array<interfaces.Binding<unknown>>> | undefined;
  if (!map) return 0;

  let count = 0;
  for (const [serviceIdentifier, bindings] of map) {
    for (const binding of bindings) {
      visit(binding, serviceIdentifier);
      count++;
    }
  }
  return count;
}

/**
 * Returns every implementation type currently bound in the container
 * that is a real constructor function. Filters out factory and value
 * bindings.
 */
export function getBoundImplementations(
  container: interfaces.Container,
): Array<NewableFunction> {
  const out: Array<NewableFunction> = [];
  forEachBinding(container, (binding) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const impl = (binding as any).implementationType;
    if (typeof impl === "function") {
      out.push(impl as NewableFunction);
    }
  });
  return out;
}
