import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The bundle gate shells out to the Wrangler CLI, which exits non-zero below
// its own `engines.node` floor. The adapter supports Node 20.19+ and CI builds
// on both 20 and 22, so skip the gate on the older leg instead of failing it.
// The measurement still runs — and still blocks the merge — on the newer leg.

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerManifestPath = join(packageDir, "node_modules", "wrangler", "package.json");

function readWranglerRequirement() {
  if (!existsSync(wranglerManifestPath)) {
    return undefined;
  }
  const { version, engines } = JSON.parse(readFileSync(wranglerManifestPath, "utf8"));
  const minimumMajor = /(\d+)/.exec(engines?.node ?? "")?.[1];
  return minimumMajor ? { version, minimumMajor: Number(minimumMajor) } : undefined;
}

const requirement = readWranglerRequirement();
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

// Without a readable manifest, defer to the measurement script: it reports a
// precise error when the package-local Wrangler is missing or unpinned.
if (requirement && nodeMajor < requirement.minimumMajor) {
  process.stdout.write(
    `Skipping the Cloudflare bundle gate on Node.js ${process.versions.node}; ` +
      `Wrangler ${requirement.version} requires Node.js ${requirement.minimumMajor} or newer.\n`,
  );
} else {
  await import("./measure-cloudflare-bindings-bundles.mjs");
}
