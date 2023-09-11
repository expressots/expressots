const fs = require("fs");

if (process.argv.length !== 3) {
  console.error("Usage: node rm.js <dir/file>");
  process.exit(1);
}

const target = process.argv[2];

try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed: ${target}`);
} catch (error) {
  console.error(`Error: Unable to remove '${target}'`);
  process.exit(1);
}
