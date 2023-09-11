const fs = require("fs");

if (process.argv.length !== 4) {
  console.error("Usage: node mv.js <origin> <destination>");
  process.exit(1);
}

const origin = process.argv[2];
const destination = process.argv[3];

if (!fs.existsSync(origin)) {
  console.error(`Error: Origin '${origin}' not found`);
  process.exit(1);
}

try {
  fs.renameSync(origin, destination);
  console.log(`Move: ${origin} to ${destination}`);
} catch (error) {
  console.error(
    `Error: Unable to move '${origin}' to '${destination}'`,
  );
  process.exit(1);
}
