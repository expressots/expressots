const fs = require("fs");
const path = require("path");

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (process.argv.length < 4) {
  process.stderr.write(
    "Usage: node copy.js <origin1> <origin2> ... <destination>\n",
  );
  process.exit(1);
}

const destination = process.argv[process.argv.length - 1];

for (let i = 2; i < process.argv.length - 1; i++) {
  const origin = process.argv[i];
  copyRecursiveSync(origin, path.join(destination, path.basename(origin)));
  process.stdout.write(`Copied: ${origin} to ${destination}\n`);
}
