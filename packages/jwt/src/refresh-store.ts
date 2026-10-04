import type { RefreshRecord, RefreshStore, RotationResult } from "./types.js";
/** Single-process example store. Restart loses sessions; use an atomic shared
 * production store for multiple processes. Calls mutate synchronously without await.
 */
export class MemoryRefreshStore implements RefreshStore {
  private families = new Map<
    string,
    {
      expiresAt: number;
      revoked: boolean;
      records: Map<string, { record: RefreshRecord; consumed: boolean }>;
    }
  >();
  private prune(now: number): void {
    for (const [id, family] of this.families)
      if (family.expiresAt <= now) this.families.delete(id);
  }
  async create(record: RefreshRecord, now: number): Promise<void> {
    this.prune(now);
    if (this.families.has(record.family))
      throw new Error("Refresh family already exists");
    this.families.set(record.family, {
      expiresAt: record.sessionExpiresAt,
      revoked: false,
      records: new Map([
        [record.id, { record: structuredClone(record), consumed: false }],
      ]),
    });
  }
  async consume(
    previous: RefreshRecord,
    successor: RefreshRecord,
    now: number,
  ): Promise<RotationResult> {
    this.prune(now);
    const family = this.families.get(previous.family);
    const stored = family?.records.get(previous.id);
    if (!family || !stored || family.revoked || family.expiresAt <= now)
      return "invalid";
    if (
      stored.record.subject !== previous.subject ||
      stored.record.expiresAt !== previous.expiresAt ||
      stored.record.sessionExpiresAt !== previous.sessionExpiresAt
    )
      return "invalid";
    if (stored.consumed) {
      family.revoked = true;
      return "replay";
    }
    if (
      stored.record.expiresAt <= now ||
      successor.family !== previous.family ||
      successor.subject !== previous.subject ||
      successor.sessionExpiresAt !== family.expiresAt ||
      successor.expiresAt > family.expiresAt ||
      family.records.has(successor.id)
    )
      return "invalid";
    stored.consumed = true;
    family.records.set(successor.id, {
      record: structuredClone(successor),
      consumed: false,
    });
    return "rotated";
  }
  async revokeFamily(familyId: string, now: number): Promise<void> {
    this.prune(now);
    const family = this.families.get(familyId);
    if (family) family.revoked = true;
  }
}
