/**
 * Per-runner invocation adapters for the active "Run tests with
 * coverage" mode.
 *
 * Each adapter knows two things: how to invoke its runner with coverage
 * enabled, and (implicitly) where it writes the artifacts the
 * `CoverageEngine` will then detect. They emit Istanbul JSON wherever
 * possible (our canonical coverage input), falling back to LCOV for
 * node:test, and — so the Tests tab populates without manual reporter
 * config — a machine-readable test report (`test-results.json` /
 * `junit.xml`) on the side, using each runner's built-in reporters only
 * (no extra dependencies).
 *
 * The argv is always rebuilt here from a vetted runner name; the command
 * string from the WS message is never forwarded to a shell, mirroring
 * the security fix-runner's allow-list discipline.
 */

/** Test runners the active-run mode knows how to invoke. */
export type RunnerName = 'vitest' | 'jest' | 'mocha' | 'node:test';

/** A vetted command + argv pair for invoking a runner with coverage. */
export interface RunnerInvocation {
  cmd: string;
  args: string[];
  /** Human-readable command for the transcript footer. */
  pretty: string;
}

/** Test report the engine auto-detects, written next to the coverage artifact. */
const TEST_RESULTS_JSON = 'test-results.json';
const JUNIT_XML = 'junit.xml';

const ADAPTERS: Record<RunnerName, RunnerInvocation> = {
  // Vitest: `json` coverage reporter writes coverage/coverage-final.json;
  // `text` gives a readable transcript. The `json` test reporter (Jest-shaped)
  // is written to a file so it doesn't flood the panel, while `default` keeps
  // the live console output.
  vitest: {
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--coverage',
      '--coverage.reporter=json',
      '--coverage.reporter=text',
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${TEST_RESULTS_JSON}`,
    ],
    pretty: 'npx vitest run --coverage --reporter=json --outputFile.json=test-results.json',
  },
  // Jest: same idea via its own flag names. `--json --outputFile` writes the
  // results report to a file while the default reporter still prints to console.
  jest: {
    cmd: 'npx',
    args: [
      'jest',
      '--coverage',
      '--coverageReporters=json',
      '--coverageReporters=text',
      '--json',
      `--outputFile=${TEST_RESULTS_JSON}`,
    ],
    pretty: 'npx jest --coverage --json --outputFile=test-results.json',
  },
  // Mocha has no built-in coverage: wrap it with c8 (V8 → Istanbul JSON).
  // Mocha allows only one reporter at a time, so we keep the readable `spec`
  // console output and leave the Tests tab to a user-configured reporter.
  mocha: {
    cmd: 'npx',
    args: ['c8', '--reporter=json', '--reporter=text', 'mocha'],
    pretty: 'npx c8 --reporter=json mocha',
  },
  // node:test uses V8 coverage; emit LCOV (Node 22+). The runner supports
  // multiple reporters paired with destinations: `spec` to stdout for the
  // transcript, `junit` to a file for the Tests tab.
  'node:test': {
    cmd: 'node',
    args: [
      '--test',
      '--experimental-test-coverage',
      '--test-coverage-lcov=coverage/lcov.info',
      '--test-reporter=spec',
      '--test-reporter-destination=stdout',
      '--test-reporter=junit',
      `--test-reporter-destination=${JUNIT_XML}`,
    ],
    pretty:
      'node --test --experimental-test-coverage --test-reporter=spec --test-reporter=junit',
  },
};

/** Resolve an adapter by runner name, or `null` for unsupported input. */
export function getRunnerInvocation(name: string | undefined): RunnerInvocation | null {
  if (!name) return null;
  return ADAPTERS[name as RunnerName] ?? null;
}

/** Whether `name` is a runner we know how to invoke. */
export function isSupportedRunner(name: string | undefined): name is RunnerName {
  return !!name && name in ADAPTERS;
}
