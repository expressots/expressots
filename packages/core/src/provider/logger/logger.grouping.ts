/**
 * @file logger.grouping.ts
 * @description Log grouping and noise reduction system
 * @module @expressots/core/provider/logger
 *
 * Features:
 * - String similarity detection for grouping similar logs
 * - Time window grouping for repeated logs
 * - Configurable thresholds and windows
 * - Grouped output formatting
 */

import { LogEntry } from "./utils/log-entry";

/**
 * Configuration for log grouping.
 * @public API
 */
export interface GroupingConfig {
  /** Enable log grouping (default: true in dev, false in prod) */
  enabled: boolean;
  /** Similarity threshold for grouping (0-1, default: 0.8 = 80%) */
  similarityThreshold: number;
  /** Time window in milliseconds (default: 5000ms = 5 seconds) */
  timeWindow: number;
  /** Minimum occurrences to group (default: 3) */
  minOccurrences: number;
  /** Consider context when grouping (default: true) */
  considerContext: boolean;
  /** Maximum groups to track (default: 100) */
  maxGroups: number;
}

/**
 * Default grouping configuration.
 * @returns Default config
 * @public API
 */
export function getDefaultGroupingConfig(): GroupingConfig {
  const isDevelopment = process.env.NODE_ENV !== "production";
  return {
    enabled: isDevelopment, // Enabled in dev, disabled in prod by default
    similarityThreshold: 0.8, // 80% similarity
    timeWindow: 5000, // 5 seconds
    minOccurrences: 3, // Group if 3+ occurrences
    considerContext: true, // Consider context when grouping
    maxGroups: 100, // Track up to 100 groups
  };
}

/**
 * Grouped log entry representing multiple similar logs.
 * @public API
 */
export interface GroupedLogEntry {
  /** Representative log entry (first occurrence) */
  representative: LogEntry;
  /** Number of times this log appeared */
  count: number;
  /** First occurrence timestamp */
  firstOccurrence: Date;
  /** Last occurrence timestamp */
  lastOccurrence: Date;
  /** All unique log entries in this group (for expansion) */
  entries: Array<LogEntry>;
  /** Group key (normalized message + context) */
  groupKey: string;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for string similarity calculation.
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: Array<Array<number>> = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0-1).
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0 = completely different, 1 = identical)
 * @public API
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLength;
}

/**
 * Normalize log message for grouping.
 * Removes variable parts like IDs, timestamps, etc.
 * @param message - Log message
 * @returns Normalized message
 */
function normalizeMessage(message: string): string {
  // Remove common variable patterns:
  // - UUIDs: 8-4-4-4-12 hex pattern
  // - Numbers: standalone numbers
  // - Timestamps: ISO dates, Unix timestamps
  // - IDs: common ID patterns

  let normalized = message;

  // Remove UUIDs
  normalized = normalized.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "<uuid>",
  );

  // Remove standalone numbers (but keep numbers in context)
  normalized = normalized.replace(/\b\d+\b/g, "<num>");

  // Remove ISO timestamps
  normalized = normalized.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/g,
    "<timestamp>",
  );

  // Remove Unix timestamps (10 or 13 digits)
  normalized = normalized.replace(/\b\d{10,13}\b/g, "<timestamp>");

  // Remove common ID patterns
  normalized = normalized.replace(/\bid[:\s=]+(\w+)/gi, "id=<id>");
  normalized = normalized.replace(/\buser[:\s=]+(\w+)/gi, "user=<id>");

  return normalized.trim();
}

/**
 * Create a group key for a log entry.
 * @param entry - Log entry
 * @param considerContext - Whether to include context in key
 * @returns Group key
 */
function createGroupKey(entry: LogEntry, considerContext: boolean): string {
  const normalizedMessage = normalizeMessage(entry.message);
  const context = considerContext && entry.context ? `[${entry.context}]` : "";
  const level = entry.level.toString();
  return `${level}:${context}:${normalizedMessage}`;
}

/**
 * Log grouping manager.
 * Groups similar logs within time windows to reduce noise.
 * @public API
 */
export class LogGroupingManager {
  private config: GroupingConfig;
  private groups: Map<string, GroupedLogEntry> = new Map();
  private lastCleanup: number = Date.now();
  private readonly cleanupInterval: number = 30000; // Clean up every 30 seconds

  constructor(config?: Partial<GroupingConfig>) {
    this.config = { ...getDefaultGroupingConfig(), ...config };
  }

  /**
   * Update grouping configuration.
   * @param config - Partial configuration to merge
   */
  configure(config: Partial<GroupingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process a log entry and determine if it should be grouped.
   * @param entry - Log entry to process
   * @returns Grouped entry if grouped, or original entry if not grouped
   */
  processEntry(entry: LogEntry): LogEntry | GroupedLogEntry {
    if (!this.config.enabled) {
      return entry;
    }

    // Clean up old groups periodically
    this.cleanupOldGroups();

    const groupKey = createGroupKey(entry, this.config.considerContext);
    const now = Date.now();

    // Check if we have an existing group
    const existingGroup = this.groups.get(groupKey);

    if (existingGroup) {
      // Check if within time window
      const timeSinceLast = now - existingGroup.lastOccurrence.getTime();

      if (timeSinceLast <= this.config.timeWindow) {
        // Still within window, add to group
        existingGroup.count++;
        existingGroup.lastOccurrence = entry.timestamp;
        existingGroup.entries.push(entry);

        // Return grouped entry if we've reached minimum occurrences
        if (existingGroup.count >= this.config.minOccurrences) {
          return existingGroup;
        }

        // Not enough occurrences yet, return original entry
        return entry;
      } else {
        // Time window expired, flush the group and start new one
        const flushedGroup = { ...existingGroup };
        this.groups.delete(groupKey);
        this.createNewGroup(groupKey, entry);
        return flushedGroup.count >= this.config.minOccurrences
          ? flushedGroup
          : entry;
      }
    }

    // Check for similar groups using similarity algorithm
    const similarGroup = this.findSimilarGroup(entry);
    if (similarGroup) {
      const timeSinceLast = now - similarGroup.lastOccurrence.getTime();
      if (timeSinceLast <= this.config.timeWindow) {
        // Similar and within time window, add to group
        similarGroup.count++;
        similarGroup.lastOccurrence = entry.timestamp;
        similarGroup.entries.push(entry);

        // Update group key to use the new entry's key
        this.groups.delete(similarGroup.groupKey);
        this.groups.set(groupKey, similarGroup);
        similarGroup.groupKey = groupKey;

        if (similarGroup.count >= this.config.minOccurrences) {
          return similarGroup;
        }
        return entry;
      }
    }

    // No matching group, create new one
    this.createNewGroup(groupKey, entry);
    return entry;
  }

  /**
   * Find a similar group using string similarity.
   * @param entry - Log entry to match
   * @returns Similar group if found, null otherwise
   */
  private findSimilarGroup(entry: LogEntry): GroupedLogEntry | null {
    const normalizedMessage = normalizeMessage(entry.message);
    let bestMatch: GroupedLogEntry | null = null;
    let bestSimilarity = 0;

    for (const group of this.groups.values()) {
      const groupNormalized = normalizeMessage(group.representative.message);
      const similarity = calculateSimilarity(
        normalizedMessage,
        groupNormalized,
      );

      // Also check context similarity if enabled
      if (this.config.considerContext) {
        const contextMatch =
          entry.context === group.representative.context ? 1.0 : 0.0;
        const combinedSimilarity = similarity * 0.8 + contextMatch * 0.2;
        if (
          combinedSimilarity >= this.config.similarityThreshold &&
          combinedSimilarity > bestSimilarity
        ) {
          bestSimilarity = combinedSimilarity;
          bestMatch = group;
        }
      } else {
        if (
          similarity >= this.config.similarityThreshold &&
          similarity > bestSimilarity
        ) {
          bestSimilarity = similarity;
          bestMatch = group;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Create a new group for a log entry.
   * @param groupKey - Group key
   * @param entry - First log entry in group
   */
  private createNewGroup(groupKey: string, entry: LogEntry): void {
    // Enforce max groups limit
    if (this.groups.size >= this.config.maxGroups) {
      // Remove oldest group
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      for (const [key, group] of this.groups.entries()) {
        if (group.firstOccurrence.getTime() < oldestTime) {
          oldestTime = group.firstOccurrence.getTime();
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.groups.delete(oldestKey);
      }
    }

    const groupedEntry: GroupedLogEntry = {
      representative: entry,
      count: 1,
      firstOccurrence: entry.timestamp,
      lastOccurrence: entry.timestamp,
      entries: [entry],
      groupKey,
    };

    this.groups.set(groupKey, groupedEntry);
  }

  /**
   * Clean up groups that are outside the time window.
   */
  private cleanupOldGroups(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;

    for (const [key, group] of this.groups.entries()) {
      const timeSinceLast = now - group.lastOccurrence.getTime();
      if (timeSinceLast > this.config.timeWindow * 2) {
        // Remove groups that haven't been updated in 2x the time window
        this.groups.delete(key);
      }
    }
  }

  /**
   * Flush all pending groups.
   * Useful when shutting down or switching modes.
   * @returns Array of grouped entries that should be logged
   */
  flush(): Array<GroupedLogEntry> {
    const groupsToFlush: Array<GroupedLogEntry> = [];
    for (const group of this.groups.values()) {
      if (group.count >= this.config.minOccurrences) {
        groupsToFlush.push(group);
      }
    }
    this.groups.clear();
    return groupsToFlush;
  }

  /**
   * Reset all groups.
   */
  reset(): void {
    this.groups.clear();
  }

  /**
   * Get current group statistics.
   * @returns Statistics about current groups
   */
  getStats(): {
    totalGroups: number;
    groups: Array<{
      key: string;
      count: number;
      firstOccurrence: Date;
      lastOccurrence: Date;
    }>;
  } {
    return {
      totalGroups: this.groups.size,
      groups: Array.from(this.groups.values()).map((group) => ({
        key: group.groupKey,
        count: group.count,
        firstOccurrence: group.firstOccurrence,
        lastOccurrence: group.lastOccurrence,
      })),
    };
  }
}
