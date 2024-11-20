export function getFirstArrayDuplicate<T>(array: Array<T>): T | undefined {
  const seenValues = new Set<T>();

  for (const entry of array) {
    if (seenValues.has(entry)) {
      return entry;
    } else {
      seenValues.add(entry);
    }
  }
  return undefined;
}
