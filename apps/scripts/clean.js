#!/usr/bin/env node
/**
 * Clean script - removes all build artifacts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const dirsToClean = [
  'packages/studio-agent/dist',
  'packages/studio/dist',
  'packages/mcp-server/dist',
  '.studio',
];

const filesToClean = [
  'packages/studio-agent/tsconfig.tsbuildinfo',
  'packages/studio/tsconfig.tsbuildinfo',
  'packages/mcp-server/tsconfig.tsbuildinfo',
];

console.log('🧹 Cleaning build artifacts...\n');

for (const dir of dirsToClean) {
  const fullPath = path.join(rootDir, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true });
    console.log(`  ✓ Removed ${dir}`);
  }
}

for (const file of filesToClean) {
  const fullPath = path.join(rootDir, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`  ✓ Removed ${file}`);
  }
}

console.log('\n✅ Clean complete!');
