/**
 * Install identity management for ExpressoTS Studio.
 *
 * Generates a stable, anonymous UUIDv4 identifier on first agent start
 * and persists it to `.studio/config.json`. This id is the foundation
 * for future telemetry correlation, license checks, and multi-tenant
 * cloud routing — without ever exposing PII.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const CONFIG_DIR = '.studio';
const CONFIG_FILE = 'config.json';

interface StudioConfig {
  installId: string;
  createdAt: string;
}

/**
 * Resolve (or create) the persistent install identifier.
 *
 * Resolution order:
 * 1. Explicit `installId` passed in config → use it as-is
 * 2. Existing `.studio/config.json` → read the persisted id
 * 3. Neither → generate a new UUIDv4, persist it, return it
 *
 * IO errors are non-fatal: if we can't read or write the config file
 * (e.g. read-only filesystem in a container), we fall back to a
 * fresh in-memory id and log a warning.
 */
export function resolveInstallId(explicitId?: string): string {
  if (explicitId) return explicitId;

  const configPath = path.resolve(process.cwd(), CONFIG_DIR, CONFIG_FILE);

  // Try to read existing config
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config: StudioConfig = JSON.parse(raw);
      if (config.installId) return config.installId;
    }
  } catch {
    // Corrupted or unreadable — fall through to generate
  }

  // Generate new id
  const newId = randomUUID();

  // Persist (best-effort)
  try {
    const dir = path.resolve(process.cwd(), CONFIG_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Merge with existing config if present (don't clobber other keys)
    let existing: Record<string, unknown> = {};
    try {
      if (fs.existsSync(configPath)) {
        existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch {
      // start fresh
    }

    const config: StudioConfig = {
      ...existing as any,
      installId: newId,
      createdAt: existing.createdAt as string || new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  } catch {
    // Non-fatal: read-only FS, Docker without volume, etc.
    // The id lives in memory for this session only.
  }

  return newId;
}
