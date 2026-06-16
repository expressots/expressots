import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseIstanbulCoverage, type IstanbulCoverageData } from './istanbul-parser.js';
import { parseLcov } from './lcov-parser.js';
import { buildCoverageTree } from './tree-builder.js';
import { combineMetrics } from './metrics.js';
import { computeDiffCoverage } from './git-diff.js';
import { parseTestResults } from './test-results-parser.js';
import { CoverageEngine } from './coverage-engine.js';
import { loadCoverageConfig, mergeCoverageConfig } from './config.js';
import { resolveThresholds } from './thresholds.js';
import type { FileCoverage } from '../types/index.js';

/** Build a throwaway project dir with a package.json (+ optional config). */
function scaffoldProject(pkg: object, coverageJson?: object): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cov-proj-')));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  if (coverageJson) {
    fs.mkdirSync(path.join(dir, '.studio'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.studio', 'coverage.json'),
      JSON.stringify(coverageJson),
    );
  }
  return dir;
}

// ─────────────────────────────────── Istanbul ──────────────────────────

describe('parseIstanbulCoverage', () => {
  const fixture: IstanbulCoverageData = {
    '/proj/src/a.ts': {
      path: '/proj/src/a.ts',
      statementMap: {
        '0': { start: { line: 1 }, end: { line: 1 } },
        '1': { start: { line: 2 }, end: { line: 2 } },
        '2': { start: { line: 3 }, end: { line: 3 } },
      },
      fnMap: { '0': { name: 'foo', loc: { start: { line: 1 }, end: { line: 3 } } } },
      branchMap: {
        '0': {
          loc: { start: { line: 2 }, end: { line: 2 } },
          locations: [
            { start: { line: 2 }, end: { line: 2 } },
            { start: { line: 2 }, end: { line: 2 } },
          ],
        },
      },
      s: { '0': 1, '1': 0, '2': 5 },
      f: { '0': 1 },
      b: { '0': [1, 0] },
    },
  };

  const files = parseIstanbulCoverage(fixture);

  it('produces exactly one file entry', () => {
    expect(files).toHaveLength(1);
  });

  it('computes statement coverage (2 of 3 hit)', () => {
    expect(files[0].metrics.statements).toMatchObject({ covered: 2, total: 3 });
    expect(files[0].metrics.statements.pct).toBeCloseTo(66.67, 1);
  });

  it('computes function coverage (1 of 1)', () => {
    expect(files[0].metrics.functions).toMatchObject({ covered: 1, total: 1, pct: 100 });
  });

  it('computes branch coverage and partial branch lines', () => {
    expect(files[0].metrics.branches).toMatchObject({ covered: 1, total: 2, pct: 50 });
    expect(files[0].partialBranchLines).toEqual([2]);
  });

  it('derives covered / uncovered lines from the statement map', () => {
    expect(files[0].coveredLines).toEqual([1, 3]);
    expect(files[0].uncoveredLines).toEqual([2]);
    expect(files[0].metrics.lines).toMatchObject({ covered: 2, total: 3 });
  });

  it('treats files with no branches as 100% branch coverage', () => {
    const noBranch = parseIstanbulCoverage({
      '/proj/x.ts': {
        path: '/proj/x.ts',
        statementMap: { '0': { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { '0': 1 },
        f: {},
        b: {},
      },
    });
    expect(noBranch[0].metrics.branches.pct).toBe(100);
  });
});

// ───────────────────────────────────── LCOV ────────────────────────────

describe('parseLcov', () => {
  const lcov = [
    'SF:/proj/src/a.ts',
    'DA:1,1',
    'DA:2,0',
    'DA:3,4',
    'FN:1,foo',
    'FNDA:1,foo',
    'FNDA:0,bar',
    'BRDA:2,0,0,1',
    'BRDA:2,0,1,-',
    'end_of_record',
    '',
  ].join('\n');

  const files = parseLcov(lcov);

  it('parses one file with covered / uncovered lines', () => {
    expect(files).toHaveLength(1);
    expect(files[0].coveredLines).toEqual([1, 3]);
    expect(files[0].uncoveredLines).toEqual([2]);
    expect(files[0].metrics.lines).toMatchObject({ covered: 2, total: 3 });
  });

  it('parses function hit counts from FNDA records', () => {
    expect(files[0].metrics.functions).toMatchObject({ covered: 1, total: 2 });
  });

  it('parses branches and marks the partial branch line', () => {
    expect(files[0].metrics.branches).toMatchObject({ covered: 1, total: 2 });
    expect(files[0].partialBranchLines).toEqual([2]);
  });

  it('mirrors lines into statements (LCOV has no statement data)', () => {
    expect(files[0].metrics.statements).toEqual(files[0].metrics.lines);
  });
});

// ─────────────────────────────────── Tree roll-up ──────────────────────

describe('buildCoverageTree', () => {
  const mk = (relPath: string, covered: number, total: number): FileCoverage => ({
    path: `/proj/${relPath}`,
    relPath,
    metrics: {
      statements: { covered, total, pct: (covered / total) * 100 },
      branches: { covered, total, pct: (covered / total) * 100 },
      functions: { covered, total, pct: (covered / total) * 100 },
      lines: { covered, total, pct: (covered / total) * 100 },
    },
    coveredLines: [],
    uncoveredLines: [],
    partialBranchLines: [],
  });

  it('rolls child file metrics up into directory totals', () => {
    const files = [mk('src/a.ts', 1, 2), mk('src/b.ts', 3, 4)];
    const tree = buildCoverageTree(files);
    // root collapses to nothing; its single child is the `src` dir.
    expect(tree.type).toBe('dir');
    const src = tree.children![0];
    expect(src.metrics.lines).toMatchObject({ covered: 4, total: 6 });
    expect(src.children).toHaveLength(2);
  });

  it('matches combineMetrics for the root totals', () => {
    const files = [mk('src/a.ts', 1, 2), mk('lib/b.ts', 3, 4)];
    const tree = buildCoverageTree(files);
    const expected = combineMetrics(files.map((f) => f.metrics));
    expect(tree.metrics.lines.covered).toBe(expected.lines.covered);
    expect(tree.metrics.lines.total).toBe(expected.lines.total);
  });

  it('collapses single-child directory chains', () => {
    const files = [mk('src/modules/user/user.service.ts', 1, 1)];
    const tree = buildCoverageTree(files);
    const top = tree.children![0];
    expect(top.name).toBe('src/modules/user');
    expect(top.children![0].name).toBe('user.service.ts');
  });
});

// ─────────────────────────────── Diff coverage ─────────────────────────

function gitAvailable(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe.runIf(gitAvailable())('computeDiffCoverage (real git repo)', () => {
  it('intersects changed working-tree lines with coverage', async () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cov-')));
    const git = (args: string[]) =>
      execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
        cwd: tmp,
        stdio: 'ignore',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 't',
          GIT_AUTHOR_EMAIL: 't@t',
          GIT_COMMITTER_NAME: 't',
          GIT_COMMITTER_EMAIL: 't@t',
        },
      });

    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    const file = path.join(tmp, 'src', 'a.ts');
    fs.writeFileSync(file, 'const a = 1;\nconst b = 2;\nconst c = 3;\n');

    git(['init']);
    git(['add', '.']);
    git(['commit', '-m', 'init']);

    // Modify line 3 only — diff should report line 3 as changed.
    fs.writeFileSync(file, 'const a = 1;\nconst b = 2;\nconst c = 99;\n');

    const files: FileCoverage[] = [
      {
        path: file,
        relPath: 'src/a.ts',
        metrics: {
          statements: { covered: 2, total: 3, pct: 66.67 },
          branches: { covered: 0, total: 0, pct: 100 },
          functions: { covered: 0, total: 0, pct: 100 },
          lines: { covered: 2, total: 3, pct: 66.67 },
        },
        coveredLines: [1, 2],
        uncoveredLines: [3],
        partialBranchLines: [],
      },
    ];

    const diff = await computeDiffCoverage(tmp, files);

    expect(diff.unavailable).toBeFalsy();
    expect(diff.changedLineCount).toBe(1);
    expect(diff.coveredLineCount).toBe(0);
    expect(diff.uncoveredLineCount).toBe(1);
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].uncoveredChanged).toEqual([3]);
    expect(diff.files[0].pct).toBe(0);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reports unavailable outside a git repository', async () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cov-nogit-')));
    const diff = await computeDiffCoverage(tmp, []);
    expect(diff.unavailable).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

// ─────────────────────────────── Test results ──────────────────────────

describe('parseTestResults', () => {
  it('parses JUnit XML with pass / fail / skip', () => {
    const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="suite">
    <testcase name="passes" classname="A" time="0.01" />
    <testcase name="fails" classname="A" time="0.5">
      <failure message="expected 1 to be 2">stack</failure>
    </testcase>
    <testcase name="skips" classname="A" time="0">
      <skipped />
    </testcase>
  </testsuite>
</testsuites>`;
    const summary = parseTestResults(xml);
    expect(summary).not.toBeNull();
    expect(summary!.source).toBe('junit');
    expect(summary!.total).toBe(3);
    expect(summary!.passed).toBe(1);
    expect(summary!.failed).toBe(1);
    expect(summary!.skipped).toBe(1);
    // Failures sort first.
    expect(summary!.cases[0].name).toBe('fails');
    expect(summary!.cases[0].message).toContain('expected 1 to be 2');
  });

  it('parses Jest/Vitest JSON reporter output', () => {
    const json = JSON.stringify({
      testResults: [
        {
          name: '/proj/a.test.ts',
          assertionResults: [
            { title: 'ok', status: 'passed', duration: 5 },
            { title: 'bad', status: 'failed', duration: 12, failureMessages: ['boom'] },
          ],
        },
      ],
    });
    const summary = parseTestResults(json);
    expect(summary!.source).toBe('json');
    expect(summary!.passed).toBe(1);
    expect(summary!.failed).toBe(1);
    expect(summary!.cases[0].name).toBe('bad');
  });

  it('parses TAP output', () => {
    const tap = ['TAP version 13', 'ok 1 - first', 'not ok 2 - second', '1..2'].join('\n');
    const summary = parseTestResults(tap);
    expect(summary!.source).toBe('tap');
    expect(summary!.passed).toBe(1);
    expect(summary!.failed).toBe(1);
  });

  it('returns null for unrecognised content', () => {
    expect(parseTestResults('just some text')).toBeNull();
  });
});

// ───────────────────────────── Runner detection ────────────────────────

describe('runner detection (via CoverageEngine seed report)', () => {
  it('detects ALL installed runners, not just the first', () => {
    const dir = scaffoldProject({
      devDependencies: { vitest: '^4', jest: '^30', mocha: '^11' },
    });
    const engine = new CoverageEngine({ cwd: dir, dbPath: path.join(dir, '.studio/studio.db') });
    const { scanState } = engine.getReport();
    expect(scanState.detectedRunners).toEqual(['vitest', 'jest', 'mocha']);
    // Primary follows priority order when no override is configured.
    expect(scanState.runner).toBe('vitest');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('lets .studio/coverage.json pin the primary runner', () => {
    const dir = scaffoldProject(
      { devDependencies: { vitest: '^4', jest: '^30', mocha: '^11' } },
      { runner: 'mocha' },
    );
    const engine = new CoverageEngine({ cwd: dir, dbPath: path.join(dir, '.studio/studio.db') });
    const { scanState } = engine.getReport();
    expect(scanState.runner).toBe('mocha');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('lets a programmatic override beat the config file', () => {
    const dir = scaffoldProject(
      { devDependencies: { jest: '^30' } },
      { runner: 'jest' },
    );
    const engine = new CoverageEngine({
      cwd: dir,
      dbPath: path.join(dir, '.studio/studio.db'),
      coverage: { runner: 'vitest' },
    });
    expect(engine.getReport().scanState.runner).toBe('vitest');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('suggests the project coverage script by inspecting its body', () => {
    const dir = scaffoldProject({
      devDependencies: { jest: '^30' },
      scripts: { 'test:cov': 'node scripts/runner.mjs --coverage' },
    });
    const engine = new CoverageEngine({ cwd: dir, dbPath: path.join(dir, '.studio/studio.db') });
    expect(engine.getReport().scanState.suggestedCommand).toBe('npm run test:cov');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('falls back to the runner example when no coverage script exists', () => {
    const dir = scaffoldProject({ devDependencies: { jest: '^30' } });
    const engine = new CoverageEngine({ cwd: dir, dbPath: path.join(dir, '.studio/studio.db') });
    expect(engine.getReport().scanState.suggestedCommand).toContain('jest');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('prefers a configured custom command for the hint', () => {
    const dir = scaffoldProject(
      { devDependencies: { vitest: '^4' } },
      { command: 'pnpm coverage' },
    );
    const engine = new CoverageEngine({ cwd: dir, dbPath: path.join(dir, '.studio/studio.db') });
    expect(engine.getReport().scanState.suggestedCommand).toBe('pnpm coverage');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ─────────────────────────────── Config / gates ────────────────────────

describe('coverage config + thresholds', () => {
  it('loads and validates .studio/coverage.json', () => {
    const dir = scaffoldProject({}, { runner: 'vitest', paths: ['cov/final.json'], thresholds: { lines: 80, bogus: 1 } });
    const cfg = loadCoverageConfig(path.join(dir, '.studio/studio.db'));
    expect(cfg.runner).toBe('vitest');
    expect(cfg.paths).toEqual(['cov/final.json']);
    expect(cfg.thresholds).toEqual({ lines: 80 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns {} for a missing config file', () => {
    expect(loadCoverageConfig('/nonexistent/.studio/studio.db')).toEqual({});
  });

  it('merges programmatic config over file config (deep thresholds)', () => {
    const merged = mergeCoverageConfig(
      { runner: 'jest', thresholds: { lines: 80, branches: 70 } },
      { runner: 'vitest', thresholds: { branches: 90 } },
    );
    expect(merged.runner).toBe('vitest');
    expect(merged.thresholds).toEqual({ lines: 80, branches: 90 });
  });

  it('resolves thresholds from config, env wins', () => {
    expect(resolveThresholds({ lines: 75 })).toEqual({ lines: 75 });
    expect(resolveThresholds(undefined)).toBeNull();

    const prev = process.env.EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD;
    process.env.EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD = '90';
    expect(resolveThresholds({ lines: 10 })).toEqual({
      lines: 90,
      branches: 90,
      functions: 90,
      statements: 90,
    });
    if (prev === undefined) delete process.env.EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD;
    else process.env.EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD = prev;
  });
});
