/**
 * Parse test-run reports into the unified `TestRunSummary`.
 *
 * Three formats, auto-detected from the content so the caller doesn't
 * have to care which reporter produced the file:
 *   - JUnit XML (`<testsuite>/<testcase>`) — the lingua franca.
 *   - Runner JSON (Jest / Vitest `--reporter=json` shape).
 *   - TAP (`ok` / `not ok` lines).
 *
 * Everything is regex / structural — no XML dependency — and tolerant of
 * partial or slightly malformed input. Cases are capped and ordered
 * "failures first, then slowest" so the UI shows what matters without
 * shipping thousands of green dots.
 */

import type { TestCaseResult, TestRunSummary } from '../types/index.js';

/** Max cases shipped to the UI (failures + slowest survivors). */
const MAX_CASES = 250;

/** Test-report formats the parser can auto-detect. */
export type TestResultsFormat = 'junit' | 'tap' | 'json';

/** Auto-detect the format and parse. Returns `null` if unrecognised. */
export function parseTestResults(content: string): TestRunSummary | null {
  const trimmed = content.trimStart();
  if (trimmed.length === 0) return null;

  if (trimmed.startsWith('<')) return finalize(parseJUnit(content), 'junit');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const cases = parseRunnerJson(content);
    return cases ? finalize(cases, 'json') : null;
  }
  if (/^(?:TAP version|ok |not ok )/m.test(trimmed)) {
    return finalize(parseTap(content), 'tap');
  }
  return null;
}

// ───────────────────────────────────────── JUnit ──────────────────────

function parseJUnit(xml: string): TestCaseResult[] {
  const cases: TestCaseResult[] = [];
  const caseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;

  while ((m = caseRe.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[3] ?? '';
    const name = attr(attrs, 'name') ?? '(unnamed)';
    const suite = attr(attrs, 'classname') ?? undefined;
    const time = Number(attr(attrs, 'time') ?? '0');

    let status: TestCaseResult['status'] = 'passed';
    let message: string | undefined;

    if (/<skipped\b/.test(body)) {
      status = 'skipped';
    } else {
      const fail = /<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/.exec(body);
      if (fail) {
        status = 'failed';
        message =
          attr(fail[2], 'message') ??
          (decodeXml(fail[3] ?? '').trim() || undefined);
      }
    }

    cases.push({
      name,
      suite,
      status,
      durationMs: Number.isFinite(time) ? Math.round(time * 1000) : 0,
      message: message ? truncate(message, 500) : undefined,
    });
  }
  return cases;
}

// ─────────────────────────────────────────── TAP ──────────────────────

function parseTap(text: string): TestCaseResult[] {
  const cases: TestCaseResult[] = [];
  const lineRe = /^(ok|not ok)\s+\d+\s*-?\s*(.*)$/;
  let lastFailed: TestCaseResult | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = lineRe.exec(line);
    if (m) {
      const directiveSkip = /#\s*(skip|todo)\b/i.test(m[2]);
      const c: TestCaseResult = {
        name: m[2].replace(/#\s*(skip|todo)\b.*$/i, '').trim() || '(unnamed)',
        status: directiveSkip ? 'skipped' : m[1] === 'ok' ? 'passed' : 'failed',
        durationMs: 0,
      };
      cases.push(c);
      lastFailed = c.status === 'failed' ? c : null;
      continue;
    }
    // Capture the first YAML-ish message line under a failing assertion.
    if (lastFailed && /message:/.test(line)) {
      lastFailed.message = truncate(line.replace(/^.*?message:\s*/, ''), 500);
      lastFailed = null;
    }
  }
  return cases;
}

// ─────────────────────────────────────────── JSON ─────────────────────

/** Jest / Vitest `--reporter=json` shape (the common subset we read). */
interface RunnerJson {
  testResults?: Array<{
    name?: string;
    assertionResults?: Array<{
      title?: string;
      fullName?: string;
      ancestorTitles?: string[];
      status?: string;
      duration?: number;
      failureMessages?: string[];
    }>;
  }>;
}

function parseRunnerJson(content: string): TestCaseResult[] | null {
  let parsed: RunnerJson;
  try {
    parsed = JSON.parse(content) as RunnerJson;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.testResults)) return null;

  const cases: TestCaseResult[] = [];
  for (const file of parsed.testResults) {
    for (const a of file.assertionResults ?? []) {
      const status: TestCaseResult['status'] =
        a.status === 'failed'
          ? 'failed'
          : a.status === 'pending' || a.status === 'skipped' || a.status === 'todo'
            ? 'skipped'
            : 'passed';
      cases.push({
        name: a.title ?? a.fullName ?? '(unnamed)',
        suite: a.ancestorTitles?.join(' › ') || file.name,
        status,
        durationMs: typeof a.duration === 'number' ? Math.round(a.duration) : 0,
        message:
          status === 'failed' && a.failureMessages?.length
            ? truncate(stripAnsi(a.failureMessages.join('\n')), 500)
            : undefined,
        filePath: file.name,
      });
    }
  }
  return cases;
}

// ─────────────────────────────────────── Assemble ─────────────────────

function finalize(
  cases: TestCaseResult[],
  source: TestResultsFormat,
): TestRunSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let durationMs = 0;
  for (const c of cases) {
    if (c.status === 'passed') passed++;
    else if (c.status === 'failed') failed++;
    else skipped++;
    durationMs += c.durationMs;
  }

  // Failures first, then slowest — that's what the user wants to see.
  const ordered = [...cases].sort((a, b) => {
    const af = a.status === 'failed' ? 0 : 1;
    const bf = b.status === 'failed' ? 0 : 1;
    if (af !== bf) return af - bf;
    return b.durationMs - a.durationMs;
  });

  return {
    generatedAt: Date.now(),
    total: cases.length,
    passed,
    failed,
    skipped,
    durationMs,
    cases: ordered.slice(0, MAX_CASES),
    source,
    scanState: { state: 'idle', lastRunAt: Date.now() },
  };
}

// ───────────────────────────────────────── Utils ──────────────────────

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? decodeXml(m[1]) : undefined;
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
