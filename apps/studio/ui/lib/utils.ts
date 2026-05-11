/**
 * Utility functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format duration in ms */
export function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/** Format bytes */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** Format timestamp */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/** Format relative time */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/** Get status color */
export function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return 'text-error-500';
  if (statusCode >= 400) return 'text-warning-500';
  if (statusCode >= 300) return 'text-primary-400';
  if (statusCode >= 200) return 'text-success-500';
  return 'text-gray-400';
}

/** Get status background color */
export function getStatusBgColor(statusCode: number): string {
  if (statusCode >= 500) return 'bg-error-500/10';
  if (statusCode >= 400) return 'bg-warning-500/10';
  if (statusCode >= 300) return 'bg-primary-400/10';
  if (statusCode >= 200) return 'bg-success-500/10';
  return 'bg-gray-500/10';
}

/** Get method color */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-green-400';
    case 'POST':
      return 'text-blue-400';
    case 'PUT':
      return 'text-yellow-400';
    case 'PATCH':
      return 'text-orange-400';
    case 'DELETE':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/** Get method background color */
export function getMethodBgColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-green-500/10';
    case 'POST':
      return 'bg-blue-500/10';
    case 'PUT':
      return 'bg-yellow-500/10';
    case 'PATCH':
      return 'bg-orange-500/10';
    case 'DELETE':
      return 'bg-red-500/10';
    default:
      return 'bg-gray-500/10';
  }
}

/** Get duration color */
export function getDurationColor(ms: number): string {
  if (ms < 100) return 'text-success-500';
  if (ms < 500) return 'text-warning-500';
  return 'text-error-500';
}

/** Truncate text */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/** Parse JSON safely */
export function safeParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Copy to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
