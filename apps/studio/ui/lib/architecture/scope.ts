import type { ContainerSnapshot } from '../../types';

export function buildScopeIndex(snapshot: ContainerSnapshot | null): Map<string, string> {
  const index = new Map<string, string>();
  if (!snapshot) return index;
  for (const binding of snapshot.bindings) {
    if (!index.has(binding.className)) index.set(binding.className, binding.scope);
    if (!index.has(binding.serviceIdentifier)) index.set(binding.serviceIdentifier, binding.scope);
  }
  return index;
}
