/**
 * k6 load script for the v4 benchmark suite. See BENCHMARK.md.
 *
 * Usage:
 *   k6 run benchmark.js
 *
 * Each target server is started independently on the same port so the
 * URL stays constant across runs.
 */
import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 1000,
  duration: "60s",
};

export default function () {
  http.get("http://localhost:3000/");
  sleep(1);
}

// Uncomment to emit an HTML report alongside the JSON:
// import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
// export function handleSummary(data) {
//   return { "summary.html": htmlReport(data) };
// }
