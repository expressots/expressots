/**
 * Database View
 *
 * Read-only inspector for the ExpressoTS in-memory database
 * (`InMemoryDBProvider`), captured by the Studio Agent:
 *   - Table list with record counts
 *   - Schema panel (fields with key/unique/index badges + relations)
 *   - Paginated row browser
 *
 * When no `InMemoryDBProvider` is registered, the agent reports
 * `available: false` and this view shows a friendly empty state.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Key,
  Hash,
  Fingerprint,
  Link2,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import type {
  DatabaseEntitySchema,
  DatabaseFieldSchema,
  DatabaseRelationSchema,
} from '../types';

const PAGE_SIZE = 50;

const relationColors: Record<string, string> = {
  hasOne: 'text-sky-300 bg-sky-950/40 border-sky-700/40',
  hasMany: 'text-emerald-300 bg-emerald-950/40 border-emerald-700/40',
  belongsTo: 'text-amber-300 bg-amber-950/40 border-amber-700/40',
  manyToMany: 'text-purple-300 bg-purple-950/40 border-purple-700/40',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatCell(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DatabaseView() {
  const databaseSnapshot = useAppStore((s) => s.databaseSnapshot);
  const databaseTableData = useAppStore((s) => s.databaseTableData);
  const { requestDatabaseSchema, requestDatabaseTable } = useSocket();

  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // Refresh the schema each time the view mounts so newly created
  // tables / records show up without a reconnect.
  useEffect(() => {
    requestDatabaseSchema();
  }, [requestDatabaseSchema]);

  const entities = useMemo(
    () => databaseSnapshot?.entities ?? [],
    [databaseSnapshot],
  );

  // Default-select the first table once a schema is available.
  useEffect(() => {
    if (!selected && entities.length > 0) {
      setSelected(entities[0].name);
    }
  }, [entities, selected]);

  // Fetch rows whenever the selected table or page changes.
  useEffect(() => {
    if (selected) {
      requestDatabaseTable(selected, offset, PAGE_SIZE);
    }
  }, [selected, offset, requestDatabaseTable]);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.name === selected) ?? null,
    [entities, selected],
  );

  // Empty state — provider not registered or not yet captured.
  if (!databaseSnapshot || !databaseSnapshot.available) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Database className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No in-memory database detected</p>
        <p className="text-sm mt-2 max-w-md text-center">
          Register the <code className="text-gray-400">InMemoryDBProvider</code>{' '}
          as a singleton in your app's <code className="text-gray-400">configureServices()</code>{' '}
          to inspect its schema and data here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Tables" value={databaseSnapshot.tableCount} />
        <SummaryCard label="Total records" value={databaseSnapshot.totalRecords} />
        <SummaryCard
          label="Captured"
          value={new Date(databaseSnapshot.timestamp).toLocaleTimeString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Table list */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <TableIcon className="w-3.5 h-3.5" /> Tables
          </div>
          {entities.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500">
              No tables created yet.
            </p>
          ) : (
            <ul>
              {entities.map((entity) => (
                <li key={entity.name}>
                  <button
                    onClick={() => {
                      setSelected(entity.name);
                      setOffset(0);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm transition-colors ${
                      selected === entity.name
                        ? 'bg-primary-500/10 text-primary-300'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate">{entity.name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      {entity.recordCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4 min-w-0">
          {selectedEntity ? (
            <>
              <SchemaPanel entity={selectedEntity} />
              <RowBrowser
                entity={selectedEntity}
                rows={
                  databaseTableData?.table === selectedEntity.name
                    ? databaseTableData.rows
                    : []
                }
                total={
                  databaseTableData?.table === selectedEntity.name
                    ? databaseTableData.total
                    : selectedEntity.recordCount
                }
                offset={offset}
                onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                onNext={() => setOffset((o) => o + PAGE_SIZE)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Select a table to inspect its schema and data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchemaPanel({ entity }: { entity: DatabaseEntitySchema }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-800">
        <Database className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white">{entity.name}</h3>
        {entity.timestamps && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-gray-400">
            <Clock className="w-3 h-3" /> timestamps
          </span>
        )}
        {entity.softDelete && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-gray-400">
            <Trash2 className="w-3 h-3" /> soft delete
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {formatBytes(entity.memoryEstimate)} · {entity.recordCount} rows
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 py-3">
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Fields
        </h4>
        <div className="flex flex-wrap gap-2">
          {entity.fields.map((field) => (
            <FieldChip key={field.name} field={field} />
          ))}
        </div>
      </div>

      {/* Relations */}
      {entity.relations.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <h4 className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Relations
          </h4>
          <ul className="space-y-1.5">
            {entity.relations.map((rel) => (
              <RelationRow key={rel.field} relation={rel} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldChip({ field }: { field: DatabaseFieldSchema }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-700 bg-gray-800/60 text-xs text-gray-200">
      {field.isPrimaryKey && <Key className="w-3 h-3 text-amber-400" />}
      {field.isUnique && !field.isPrimaryKey && (
        <Fingerprint className="w-3 h-3 text-sky-400" />
      )}
      {field.isIndexed && !field.isUnique && !field.isPrimaryKey && (
        <Hash className="w-3 h-3 text-gray-400" />
      )}
      <span>{field.name}</span>
      {field.autoGenerate && (
        <span className="text-[10px] text-emerald-400">
          {field.autoGenerate}
        </span>
      )}
      {field.isNullable && (
        <span className="text-[10px] text-gray-500">nullable</span>
      )}
    </span>
  );
}

function RelationRow({ relation }: { relation: DatabaseRelationSchema }) {
  const cls =
    relationColors[relation.type] ||
    'text-gray-300 bg-gray-800 border-gray-700';
  return (
    <li className="flex items-center gap-2 text-sm">
      <Link2 className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-gray-200">{relation.field}</span>
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}
      >
        {relation.type}
      </span>
      <span className="text-gray-500">→ {relation.target}</span>
      {relation.through && (
        <span className="text-[10px] text-gray-500">
          (via {relation.through})
        </span>
      )}
      {relation.foreignKey && (
        <span className="text-[10px] text-gray-600">
          fk: {relation.foreignKey}
        </span>
      )}
    </li>
  );
}

interface RowBrowserProps {
  entity: DatabaseEntitySchema;
  rows: Array<Record<string, unknown>>;
  total: number;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
}

function RowBrowser({
  entity,
  rows,
  total,
  offset,
  onPrev,
  onNext,
}: RowBrowserProps) {
  // Prefer schema-defined column order; fall back to keys present in rows.
  const columns = useMemo(() => {
    const cols = entity.fields.map((f) => f.name);
    const seen = new Set(cols);
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          cols.push(key);
        }
      }
    }
    return cols;
  }, [entity, rows]);

  const from = total === 0 ? 0 : offset + 1;
  const to = offset + rows.length;
  const hasPrev = offset > 0;
  const hasNext = to < total;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500">
          Rows
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {from}–{to} of {total}
          </span>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 text-center">
          No rows in this table.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={(row.id as string) ?? idx}
                  className="border-b border-gray-800/60 hover:bg-gray-800/40"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-1.5 text-gray-300 max-w-[280px] truncate"
                      title={formatCell(row[col])}
                    >
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-white mt-1">{value}</div>
    </div>
  );
}
