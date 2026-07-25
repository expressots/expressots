import type { Node } from '@xyflow/react';
import type { AppStructure } from '../../types';
import type { NodeStats, NodeWarnings, LayoutDirection, NodeData, ModuleNodeData } from './types';
import { buildGraph } from './graph';

function asNodeData(data: Node['data']): NodeData {
  return data as unknown as NodeData;
}

function asModuleNodeData(data: Node['data']): ModuleNodeData {
  return data as unknown as ModuleNodeData;
}

export function toMermaid(structure: AppStructure, layoutDir: LayoutDirection): string {
  const direction = layoutDir === 'LR' ? 'LR' : 'TB';
  const lines = [`flowchart ${direction}`];

  const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');
  const controllers = new Set(structure.controllers.map((c) => c.name));
  const services = new Set(structure.services.map((s) => s.name));
  const providers = new Set(structure.providers.map((p) => p.name));
  const middleware = new Set(structure.middleware.map((m) => m.name));

  const nameToShape = (name: string): string => {
    if (controllers.has(name)) return `${safe(name)}["${name}<br/><i>controller</i>"]`;
    if (providers.has(name)) return `${safe(name)}[(${name})]`;
    if (services.has(name)) return `${safe(name)}(["${name}"])`;
    if (middleware.has(name)) return `${safe(name)}{{"${name}<br/><i>middleware</i>"}}`;
    return `${safe(name)}["${name}"]`;
  };

  for (const m of structure.modules ?? []) {
    if (m.members.length === 0) continue;
    lines.push(`  subgraph ${safe(m.name)} ["${m.name}"]`);
    for (const member of m.members) lines.push(`    ${nameToShape(member)}`);
    lines.push(`  end`);
  }

  const inModule = new Set<string>();
  for (const m of structure.modules ?? []) for (const member of m.members) inModule.add(member);
  for (const c of structure.controllers) {
    if (!inModule.has(c.name)) lines.push(`  ${nameToShape(c.name)}`);
  }
  for (const s of structure.services) {
    if (!inModule.has(s.name)) lines.push(`  ${nameToShape(s.name)}`);
  }
  for (const p of structure.providers) {
    if (!inModule.has(p.name)) lines.push(`  ${nameToShape(p.name)}`);
  }
  for (const mw of structure.middleware) {
    if (!inModule.has(mw.name)) lines.push(`  ${nameToShape(mw.name)}`);
  }

  const middlewareScope = new Map(structure.middleware.map((m) => [m.name, m.scope]));
  const seen = new Set<string>();
  for (const dep of structure.dependencies) {
    const key = `${dep.source}->${dep.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (dep.type === 'middleware') {
      const scope = middlewareScope.get(dep.source);
      const arrow = scope === 'global' ? '-..->' : '-->';
      const label = scope === 'global' ? 'global' : 'protects';
      lines.push(`  ${safe(dep.source)} ${arrow}|${label}| ${safe(dep.target)}`);
    } else {
      lines.push(`  ${safe(dep.source)} --> ${safe(dep.target)}`);
    }
  }

  lines.push('');
  lines.push('  classDef controller fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe;');
  lines.push('  classDef service fill:#14532d,stroke:#22c55e,color:#dcfce7;');
  lines.push('  classDef provider fill:#581c87,stroke:#a855f7,color:#f3e8ff;');
  lines.push('  classDef middleware fill:#78350f,stroke:#f59e0b,color:#fef3c7;');
  for (const c of structure.controllers) lines.push(`  class ${safe(c.name)} controller;`);
  for (const s of structure.services) lines.push(`  class ${safe(s.name)} service;`);
  for (const p of structure.providers) lines.push(`  class ${safe(p.name)} provider;`);
  for (const mw of structure.middleware) lines.push(`  class ${safe(mw.name)} middleware;`);

  return lines.join('\n');
}

export function buildSvg(
  structure: AppStructure,
  opts: { stats: Map<string, NodeStats>; warnings: Map<string, NodeWarnings>; layoutDir: LayoutDirection },
): string {
  const { nodes, edges } = buildGraph(structure, {
    scopeIndex: new Map(),
    stats: opts.stats,
    warnings: opts.warnings,
    dtoEdgeLabels: new Map(),
    layoutDir: opts.layoutDir,
    showModules: true,
  });

  const W = 220;
  const H = 96;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.type === 'module') continue;
    const parent = n.parentId ? nodes.find((p) => p.id === n.parentId) : null;
    const ax = (parent?.position.x ?? 0) + n.position.x;
    const ay = (parent?.position.y ?? 0) + n.position.y;
    minX = Math.min(minX, ax);
    minY = Math.min(minY, ay);
    maxX = Math.max(maxX, ax + W);
    maxY = Math.max(maxY, ay + H);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 400;
  }

  const PAD = 40;
  const width = maxX - minX + PAD * 2;
  const height = maxY - minY + PAD * 2;
  const tx = -minX + PAD;
  const ty = -minY + PAD;

  const colorOf = (kind: string): { fill: string; stroke: string; text: string } => {
    switch (kind) {
      case 'controller':
        return { fill: '#1e3a8a', stroke: '#3b82f6', text: '#dbeafe' };
      case 'service':
        return { fill: '#14532d', stroke: '#22c55e', text: '#dcfce7' };
      case 'provider':
        return { fill: '#581c87', stroke: '#a855f7', text: '#f3e8ff' };
      case 'middleware':
        return { fill: '#78350f', stroke: '#f59e0b', text: '#fef3c7' };
      default:
        return { fill: '#1f2937', stroke: '#475569', text: '#cbd5e1' };
    }
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#0b1220"/>`);

  for (const n of nodes) {
    if (n.type !== 'module') continue;
    const x = n.position.x + tx;
    const y = n.position.y + ty;
    const w = (n.style?.width as number) ?? 240;
    const h = (n.style?.height as number) ?? 200;
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" stroke="#334155" stroke-dasharray="6 4" rx="14"/>`,
    );
    parts.push(
      `<text x="${x + 12}" y="${y + 18}" fill="#64748b" font-size="11">\u25a4 ${escapeXml(
        (asModuleNodeData(n.data)?.label ?? '').toString(),
      )}</text>`,
    );
  }

  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    if (!src || !tgt) continue;
    const srcParent = src.parentId ? nodes.find((p) => p.id === src.parentId) : null;
    const tgtParent = tgt.parentId ? nodes.find((p) => p.id === tgt.parentId) : null;
    const sx = (srcParent?.position.x ?? 0) + src.position.x + W + tx;
    const sy = (srcParent?.position.y ?? 0) + src.position.y + H / 2 + ty;
    const ex = (tgtParent?.position.x ?? 0) + tgt.position.x + tx;
    const ey = (tgtParent?.position.y ?? 0) + tgt.position.y + H / 2 + ty;
    const cx = (sx + ex) / 2;
    parts.push(
      `<path d="M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ey}, ${ex} ${ey}" stroke="#475569" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>`,
    );
    if (typeof e.label === 'string') {
      parts.push(
        `<text x="${cx}" y="${(sy + ey) / 2 - 6}" fill="#94a3b8" font-size="10" text-anchor="middle">${escapeXml(
          e.label,
        )}</text>`,
      );
    }
  }

  parts.push(
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/></marker></defs>`,
  );

  for (const n of nodes) {
    if (n.type === 'module') continue;
    const c = colorOf(n.type ?? '');
    const parent = n.parentId ? nodes.find((p) => p.id === n.parentId) : null;
    const x = (parent?.position.x ?? 0) + n.position.x + tx;
    const y = (parent?.position.y ?? 0) + n.position.y + ty;
    parts.push(
      `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>`,
    );
    parts.push(
      `<text x="${x + 12}" y="${y + 22}" fill="${c.stroke}" font-size="11">${(n.type ?? '').toString()}</text>`,
    );
    const nd = asNodeData(n.data);
    parts.push(
      `<text x="${x + 12}" y="${y + 44}" fill="${c.text}" font-size="13" font-weight="600">${escapeXml(
        (nd?.label ?? '').toString(),
      )}</text>`,
    );
    const sub: string[] = [];
    if (nd.routes !== undefined) sub.push(`${nd.routes} routes`);
    if (nd.methods !== undefined) sub.push(`${nd.methods} methods`);
    parts.push(
      `<text x="${x + 12}" y="${y + 64}" fill="${c.text}" opacity="0.7" font-size="11">${escapeXml(
        sub.join(' \u00b7 '),
      )}</text>`,
    );
    const stats = nd.stats;
    if (stats && stats.req > 0) {
      parts.push(
        `<text x="${x + 12}" y="${y + 84}" fill="${c.text}" opacity="0.7" font-size="10">${stats.req} req \u00b7 p95 ${stats.p95Ms.toFixed(
          0,
        )}ms${stats.errors ? ` \u00b7 ${stats.errors} err` : ''}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadSvg(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
