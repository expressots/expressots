const fs = require("fs").promises;

const removeTarget = async (target) => {
  try {
    await fs.rm(target, { recursive: true, force: true });
    process.stdout.write(`Removed: ${target}\n`);
  } catch (error) {
    process.stderr.write(`Error: Unable to remove '${target}'\n`);
    process.exit(1);
  }
};

if (process.argv.length !== 3) {
  process.stderr.write("Usage: node rm.js <dir/file>\n");
  process.exit(1);
}

const target = process.argv[2];
removeTarget(target);
