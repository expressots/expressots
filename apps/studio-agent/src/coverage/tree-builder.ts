/**
 * Build the collapsible coverage file-tree the UI renders.
 *
 * Files are placed into a directory hierarchy by their `relPath`;
 * directory metrics are the bottom-up sum of their children. Single
 * child-only directory chains are collapsed (`src` → `src/modules` →
 * `src/modules/user` becomes one node) so the tree reads like
 * Codecov's, not like a deep filesystem dump.
 */

import type { CoverageTreeNode, FileCoverage } from '../types/index.js';
import { combineMetrics, emptyMetrics } from './metrics.js';

interface MutableNode {
  name: string;
  path: string;
  type: 'dir' | 'file';
  file?: FileCoverage;
  children: Map<string, MutableNode>;
}

/** Construct the coverage tree from normalised per-file coverage. */
export function buildCoverageTree(files: FileCoverage[]): CoverageTreeNode {
  const root: MutableNode = {
    name: '',
    path: '',
    type: 'dir',
    children: new Map(),
  };

  for (const file of files) {
    const segments = file.relPath.split('/').filter((s) => s.length > 0);
    if (segments.length === 0) continue;

    let node = root;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLeaf = i === segments.length - 1;
      const childPath = node.path ? `${node.path}/${seg}` : seg;
      let child = node.children.get(seg);
      if (!child) {
        child = {
          name: seg,
          path: childPath,
          type: isLeaf ? 'file' : 'dir',
          children: new Map(),
        };
        node.children.set(seg, child);
      }
      if (isLeaf) child.file = file;
      node = child;
    }
  }

  return finalize(collapse(root));
}

/** Collapse single-child directory chains into one node for readability. */
function collapse(node: MutableNode): MutableNode {
  for (const [key, child] of node.children) {
    node.children.set(key, collapse(child));
  }

  if (
    node.type === 'dir' &&
    node.children.size === 1 &&
    node.path !== '' // never collapse the root away
  ) {
    const only = [...node.children.values()][0];
    if (only.type === 'dir') {
      const merged: MutableNode = {
        name: `${node.name}/${only.name}`,
        path: only.path,
        type: 'dir',
        children: only.children,
      };
      return merged;
    }
  }
  return node;
}

/** Convert the mutable tree into the immutable, metric-aggregated shape. */
function finalize(node: MutableNode): CoverageTreeNode {
  if (node.type === 'file' && node.file) {
    return {
      name: node.name,
      path: node.path,
      type: 'file',
      metrics: node.file.metrics,
    };
  }

  const children = [...node.children.values()]
    .map(finalize)
    .sort(sortNodes);

  return {
    name: node.name || 'root',
    path: node.path,
    type: 'dir',
    metrics: children.length
      ? combineMetrics(children.map((c) => c.metrics))
      : emptyMetrics(),
    children,
  };
}

/** Directories first, then files; alphabetical within each group. */
function sortNodes(a: CoverageTreeNode, b: CoverageTreeNode): number {
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name);
}
