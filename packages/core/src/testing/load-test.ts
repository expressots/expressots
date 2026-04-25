/**
 * Built-in Load Testing Utilities
 *
 * @module testing
 *
 * UNIQUE FEATURE: No other framework has built-in load testing!
 *
 * Provides comprehensive load testing with:
 * - Concurrent request handling
 * - Ramp-up strategies
 * - Percentile metrics (p95, p99)
 * - Real-time assertions
 * - Progress callbacks
 *
 * @example
 * ```typescript
 * const results = await loadTest(app, {
 *   endpoint: "/users",
 *   concurrent: 1000,
 *   duration: "10s",
 *   rampUp: "2s"
 * });
 *
 * expect(results.p95ResponseTime).toBeLessThan(200);
 * expect(results.errorRate).toBeLessThan(0.01);
 * ```
 */

import {
  LoadTestOptions,
  LoadTestResults,
  LoadTestProgress,
  LoadTestAssertions,
  ResponseTimeDistribution,
  HttpMethod,
} from "./testing.interfaces.js";

/**
 * Internal request result.
 */
interface RequestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
}

/**
 * Parse duration string to milliseconds.
 *
 * @param duration - Duration string (e.g., "10s", "1m", "500ms")
 * @returns Duration in milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Use "10s", "1m", "500ms", etc.`,
    );
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "ms";

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Calculate percentile from sorted array.
 */
function percentile(sortedArr: Array<number>, p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

/**
 * Calculate response time distribution.
 */
function calculateDistribution(times: Array<number>): ResponseTimeDistribution {
  const distribution: ResponseTimeDistribution = {
    under10ms: 0,
    under50ms: 0,
    under100ms: 0,
    under500ms: 0,
    under1s: 0,
    over1s: 0,
  };

  for (const time of times) {
    if (time < 10) {
      distribution.under10ms++;
    } else if (time < 50) {
      distribution.under50ms++;
    } else if (time < 100) {
      distribution.under100ms++;
    } else if (time < 500) {
      distribution.under500ms++;
    } else if (time < 1000) {
      distribution.under1s++;
    } else {
      distribution.over1s++;
    }
  }

  return distribution;
}

/**
 * Verify assertions against results.
 */
function verifyAssertions(
  assertions: LoadTestAssertions,
  results: Partial<LoadTestResults>,
): Array<{ assertion: string; expected: unknown; actual: unknown }> {
  const failures: Array<{
    assertion: string;
    expected: unknown;
    actual: unknown;
  }> = [];

  if (assertions.maxErrorRate !== undefined) {
    if ((results.errorRate || 0) > assertions.maxErrorRate) {
      failures.push({
        assertion: "maxErrorRate",
        expected: assertions.maxErrorRate,
        actual: results.errorRate,
      });
    }
  }

  if (assertions.minThroughput !== undefined) {
    if ((results.throughput || 0) < assertions.minThroughput) {
      failures.push({
        assertion: "minThroughput",
        expected: assertions.minThroughput,
        actual: results.throughput,
      });
    }
  }

  if (assertions.maxP95 !== undefined) {
    if ((results.p95ResponseTime || 0) > assertions.maxP95) {
      failures.push({
        assertion: "maxP95",
        expected: assertions.maxP95,
        actual: results.p95ResponseTime,
      });
    }
  }

  if (assertions.maxP99 !== undefined) {
    if ((results.p99ResponseTime || 0) > assertions.maxP99) {
      failures.push({
        assertion: "maxP99",
        expected: assertions.maxP99,
        actual: results.p99ResponseTime,
      });
    }
  }

  if (assertions.maxAverage !== undefined) {
    if ((results.averageResponseTime || 0) > assertions.maxAverage) {
      failures.push({
        assertion: "maxAverage",
        expected: assertions.maxAverage,
        actual: results.averageResponseTime,
      });
    }
  }

  return failures;
}

/**
 * Execute a single request and measure time.
 */
async function executeRequest(
  url: string,
  method: HttpMethod,
  body: unknown | undefined,
  headers: Record<string, string>,
  timeout: number,
): Promise<RequestResult> {
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  // Prevent timer from keeping Jest alive
  const timerWithUnref = timeoutId as ReturnType<typeof setTimeout> & {
    unref?: () => void;
  };
  if (typeof timerWithUnref.unref === "function") {
    timerWithUnref.unref();
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: controller.signal,
    };

    if (body !== undefined && ["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error too
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      statusCode: 0,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run load test against an endpoint.
 *
 * @layer public
 * @audience application-developers
 * @concept testing
 *
 * UNIQUE FEATURE: Built-in load testing with percentile metrics!
 *
 * @param appOrUrl - Test app or base URL
 * @param options - Load test options
 * @returns Load test results with comprehensive metrics
 *
 * @example
 * ```typescript
 * // Basic load test
 * const results = await loadTest(app, {
 *   endpoint: "/users",
 *   concurrent: 100,
 *   duration: "30s"
 * });
 *
 * console.log(`Throughput: ${results.throughput} req/s`);
 * console.log(`P95: ${results.p95ResponseTime}ms`);
 *
 * // With assertions
 * const results = await loadTest(app, {
 *   endpoint: "/api/data",
 *   concurrent: 500,
 *   duration: "1m",
 *   rampUp: "10s",
 *   assertions: {
 *     maxErrorRate: 0.01,
 *     maxP95: 200,
 *     minThroughput: 100
 *   }
 * });
 *
 * expect(results.assertionsPassed).toBe(true);
 * ```
 */
export async function loadTest(
  appOrUrl: { baseUrl: string } | string,
  options: LoadTestOptions,
): Promise<LoadTestResults> {
  const baseUrl = typeof appOrUrl === "string" ? appOrUrl : appOrUrl.baseUrl;
  const url = `${baseUrl}${options.endpoint}`;

  const {
    method = "GET",
    concurrent,
    duration,
    rampUp = "0s",
    body,
    headers = {},
    timeout = 30000,
    assertions,
    onProgress,
    warmupRequests = 10,
  } = options;

  const durationMs = parseDuration(duration);
  const rampUpMs = parseDuration(rampUp);

  // Storage for results
  const results: Array<RequestResult> = [];
  const statusCodes: Record<number, number> = {};
  let completedRequests = 0;
  let failedRequests = 0;

  // Warmup phase
  if (warmupRequests > 0) {
    console.log(`🔥 Warming up with ${warmupRequests} requests...`);
    const warmupPromises = Array.from({ length: warmupRequests }, () =>
      executeRequest(url, method, body, headers, timeout),
    );
    await Promise.all(warmupPromises);
  }

  console.log(
    `🚀 Starting load test: ${concurrent} concurrent requests for ${duration}`,
  );
  const testStartTime = Date.now();

  // Progress tracking
  let lastProgressUpdate = Date.now();
  const progressInterval = 1000; // Update every second

  const updateProgress = (): void => {
    if (!onProgress) return;

    const now = Date.now();
    if (now - lastProgressUpdate < progressInterval) return;
    lastProgressUpdate = now;

    const elapsed = (now - testStartTime) / 1000;
    const sortedTimes = results
      .filter((r) => r.success)
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);

    const progress: LoadTestProgress = {
      completed: completedRequests,
      failed: failedRequests,
      rps: completedRequests / elapsed,
      elapsed,
      p95: percentile(sortedTimes, 95),
    };

    onProgress(progress);
  };

  // Worker function
  const worker = async (workerId: number): Promise<void> => {
    // Calculate ramp-up delay for this worker
    const rampUpDelay = rampUpMs > 0 ? (workerId / concurrent) * rampUpMs : 0;

    if (rampUpDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, rampUpDelay));
    }

    // Run until duration expires
    while (Date.now() - testStartTime < durationMs) {
      const result = await executeRequest(url, method, body, headers, timeout);
      results.push(result);
      completedRequests++;

      if (!result.success) {
        failedRequests++;
      }

      // Track status codes
      statusCodes[result.statusCode] =
        (statusCodes[result.statusCode] || 0) + 1;

      updateProgress();
    }
  };

  // Start all workers
  const workers = Array.from({ length: concurrent }, (_, i) => worker(i));
  await Promise.all(workers);

  const testEndTime = Date.now();
  const totalDuration = testEndTime - testStartTime;

  // Calculate metrics
  const responseTimes = results.map((r) => r.responseTime);
  const successfulTimes = results
    .filter((r) => r.success)
    .map((r) => r.responseTime);
  const sortedTimes = [...successfulTimes].sort((a, b) => a - b);

  const totalRequests = results.length;
  const successfulRequests = results.filter((r) => r.success).length;
  const errors = results.filter((r) => !r.success).length;

  const averageResponseTime =
    successfulTimes.length > 0
      ? successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length
      : 0;

  const minResponseTime = sortedTimes.length > 0 ? sortedTimes[0] : 0;
  const maxResponseTime =
    sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;
  const medianResponseTime = percentile(sortedTimes, 50);
  const p95ResponseTime = percentile(sortedTimes, 95);
  const p99ResponseTime = percentile(sortedTimes, 99);

  const throughput = (totalRequests / totalDuration) * 1000; // requests per second

  const loadTestResults: LoadTestResults = {
    totalRequests,
    successfulRequests,
    failedRequests: errors,
    errors,
    errorRate: totalRequests > 0 ? errors / totalRequests : 0,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    minResponseTime,
    maxResponseTime,
    medianResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    throughput: Math.round(throughput * 100) / 100,
    duration: totalDuration,
    distribution: calculateDistribution(responseTimes),
    statusCodes,
    assertionsPassed: true,
    failedAssertions: [],
  };

  // Verify assertions
  if (assertions) {
    const failedAssertions = verifyAssertions(assertions, loadTestResults);
    loadTestResults.failedAssertions = failedAssertions;
    loadTestResults.assertionsPassed = failedAssertions.length === 0;
  }

  // Print summary
  console.log(`\n📊 Load Test Results:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Total Requests:    ${totalRequests}`);
  console.log(
    `   Successful:        ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Failed:            ${errors} (${(loadTestResults.errorRate * 100).toFixed(2)}%)`,
  );
  console.log(
    `   Throughput:        ${loadTestResults.throughput.toFixed(1)} req/s`,
  );
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Response Times:`);
  console.log(
    `   ├─ Average:        ${loadTestResults.averageResponseTime.toFixed(1)}ms`,
  );
  console.log(`   ├─ Min:            ${minResponseTime}ms`);
  console.log(`   ├─ Max:            ${maxResponseTime}ms`);
  console.log(`   ├─ Median:         ${medianResponseTime}ms`);
  console.log(`   ├─ P95:            ${p95ResponseTime}ms`);
  console.log(`   └─ P99:            ${p99ResponseTime}ms`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (loadTestResults.failedAssertions.length > 0) {
    console.log(`\n❌ Failed Assertions:`);
    for (const failure of loadTestResults.failedAssertions) {
      console.log(
        `   • ${failure.assertion}: expected ${failure.expected}, got ${failure.actual}`,
      );
    }
  } else if (assertions) {
    console.log(`\n✅ All assertions passed!`);
  }

  return loadTestResults;
}

/**
 * Quick benchmark function for simple performance testing.
 *
 * @param fn - Function to benchmark
 * @param iterations - Number of iterations
 * @returns Benchmark results
 *
 * @example
 * ```typescript
 * const results = await benchmark(async () => {
 *   await userService.getUser("123");
 * }, 1000);
 *
 * console.log(`Average: ${results.average}ms`);
 * ```
 */
export async function benchmark(
  fn: () => Promise<unknown> | unknown,
  iterations: number = 1000,
): Promise<{
  average: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
  total: number;
}> {
  const times: Array<number> = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    times.push(Date.now() - start);
  }

  const sorted = [...times].sort((a, b) => a - b);
  const total = times.reduce((a, b) => a + b, 0);

  return {
    average: total / iterations,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    total,
  };
}

/**
 * Stress test - gradually increase load until failure.
 *
 * @param appOrUrl - Test app or base URL
 * @param options - Stress test options
 * @returns Maximum sustainable load
 *
 * @example
 * ```typescript
 * const result = await stressTest(app, {
 *   endpoint: "/api/data",
 *   startConcurrent: 10,
 *   stepSize: 10,
 *   maxConcurrent: 500,
 *   thresholds: {
 *     maxErrorRate: 0.05,
 *     maxP95: 500
 *   }
 * });
 *
 * console.log(`Max sustainable load: ${result.maxConcurrent} concurrent requests`);
 * ```
 */
export async function stressTest(
  appOrUrl: { baseUrl: string } | string,
  options: {
    endpoint: string;
    method?: HttpMethod;
    startConcurrent?: number;
    stepSize?: number;
    maxConcurrent?: number;
    stepDuration?: string;
    thresholds?: LoadTestAssertions;
  },
): Promise<{
  maxConcurrent: number;
  breakingPoint: number;
  results: Array<{
    concurrent: number;
    passed: boolean;
    metrics: Partial<LoadTestResults>;
  }>;
}> {
  const {
    endpoint,
    method = "GET",
    startConcurrent = 10,
    stepSize = 10,
    maxConcurrent = 500,
    stepDuration = "10s",
    thresholds = { maxErrorRate: 0.05, maxP95: 1000 },
  } = options;

  const testResults: Array<{
    concurrent: number;
    passed: boolean;
    metrics: Partial<LoadTestResults>;
  }> = [];

  let currentConcurrent = startConcurrent;
  let lastPassingConcurrent = 0;
  let breakingPoint = maxConcurrent;

  console.log(`\n🔥 Stress Test: Finding breaking point`);
  console.log(`   Start: ${startConcurrent} concurrent`);
  console.log(`   Step: +${stepSize} concurrent every ${stepDuration}`);
  console.log(`   Max: ${maxConcurrent} concurrent`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  while (currentConcurrent <= maxConcurrent) {
    console.log(`📊 Testing ${currentConcurrent} concurrent requests...`);

    const result = await loadTest(appOrUrl, {
      endpoint,
      method,
      concurrent: currentConcurrent,
      duration: stepDuration,
      assertions: thresholds,
    });

    testResults.push({
      concurrent: currentConcurrent,
      passed: result.assertionsPassed,
      metrics: {
        errorRate: result.errorRate,
        p95ResponseTime: result.p95ResponseTime,
        throughput: result.throughput,
      },
    });

    if (result.assertionsPassed) {
      lastPassingConcurrent = currentConcurrent;
      console.log(`   ✅ Passed at ${currentConcurrent} concurrent\n`);
    } else {
      breakingPoint = currentConcurrent;
      console.log(`   ❌ Failed at ${currentConcurrent} concurrent\n`);
      break;
    }

    currentConcurrent += stepSize;
  }

  console.log(`\n🎯 Stress Test Complete:`);
  console.log(
    `   Maximum sustainable load: ${lastPassingConcurrent} concurrent`,
  );
  console.log(`   Breaking point: ${breakingPoint} concurrent`);

  return {
    maxConcurrent: lastPassingConcurrent,
    breakingPoint,
    results: testResults,
  };
}
