import { Scope } from "../constants/literal_types.js";
import type { interfaces } from "../interfaces/interfaces.js";
import { isPromise } from "../utils/async.js";
import { globalScopeRegistry } from "./scope-registry.js";

/**
 * Check if a scope name is a built-in scope.
 * @param scope - The scope name to check
 * @returns True if it's a built-in scope, false otherwise
 */
const isBuiltInScope = (scope: string): boolean => {
  return (
    scope === Scope.Singleton ||
    scope === Scope.Request ||
    scope === Scope.Transient
  );
};

export const tryGetFromScope = <T>(
  requestScope: interfaces.RequestScope,
  binding: interfaces.Binding<T>,
): T | Promise<T> | null => {
  // Handle Singleton scope
  if (binding.scope === Scope.Singleton && binding.activated) {
    return binding.cache!;
  }

  // Handle Request scope
  if (binding.scope === Scope.Request && requestScope.has(binding.id)) {
    return requestScope.get(binding.id) as T | Promise<T>;
  }

  // Handle custom scopes
  if (!isBuiltInScope(binding.scope)) {
    const customScopeStore = globalScopeRegistry.getScopeStore(binding.scope);
    if (customScopeStore.has(binding.id)) {
      return customScopeStore.get(binding.id) as T | Promise<T>;
    }
  }

  return null;
};

export const saveToScope = <T>(
  requestScope: interfaces.RequestScope,
  binding: interfaces.Binding<T>,
  result: T | Promise<T>,
): void => {
  // Handle Singleton scope
  if (binding.scope === Scope.Singleton) {
    _saveToSingletonScope(binding, result);
    return;
  }

  // Handle Request scope
  if (binding.scope === Scope.Request) {
    _saveToRequestScope(requestScope, binding, result);
    return;
  }

  // Handle custom scopes
  if (!isBuiltInScope(binding.scope)) {
    const customScopeStore = globalScopeRegistry.getScopeStore(binding.scope);
    if (!customScopeStore.has(binding.id)) {
      customScopeStore.set(binding.id, result);
    }
  }
};

const _saveToRequestScope = <T>(
  requestScope: interfaces.RequestScope,
  binding: interfaces.Binding<T>,
  result: T | Promise<T>,
): void => {
  if (!requestScope.has(binding.id)) {
    requestScope.set(binding.id, result);
  }
};

const _saveToSingletonScope = <T>(
  binding: interfaces.Binding<T>,
  result: T | Promise<T>,
): void => {
  // store in cache if scope is singleton
  binding.cache = result;
  binding.activated = true;

  if (isPromise(result)) {
    void _saveAsyncResultToSingletonScope(binding, result);
  }
};

const _saveAsyncResultToSingletonScope = async <T>(
  binding: interfaces.Binding<T>,
  asyncResult: Promise<T>,
): Promise<void> => {
  try {
    const result = await asyncResult;

    binding.cache = result;
  } catch (ex: unknown) {
    // allow binding to retry in future
    binding.cache = null;
    binding.activated = false;

    throw ex;
  }
};
