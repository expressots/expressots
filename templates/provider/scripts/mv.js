const fs = require("fs").promises;

const moveFile = async (origin, destination) => {
  try {
    await fs.access(origin);
  } catch (error) {
    process.stderr.write(`Error: Origin '${origin}' not found\n`);
    process.exit(1);
  }

  try {
    await fs.rename(origin, destination);
    process.stdout.write(`Move: ${origin} to ${destination}\n`);
  } catch (error) {
    process.stderr.write(
      `Error: Unable to move '${origin}' to '${destination}'\n`,
    );
    process.exit(1);
  }
};

if (process.argv.length !== 4) {
  process.stderr.write("Usage: node mv.js <origin> <destination>\n");
  process.exit(1);
}

const origin = process.argv[2];
const destination = process.argv[3];

moveFile(origin, destination);
