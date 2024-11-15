const { execSync } = require("child_process");

function makeExecutable(targetFile) {
  if (process.platform !== "win32") { // Check if the OS is not Windows
    try {
      execSync(`chmod +x ${targetFile}`);
      console.log(`Made ${targetFile} executable.`);
    } catch (error) {
      console.error(`Error making ${targetFile} executable:`, error.message);
      process.exit(1);
    }
  } else {
    console.log(`Skipping chmod on Windows for ${targetFile}`);
  }
}

if (process.argv.length !== 3) {
  console.error("Usage: node chmod.js <file>");
  process.exit(1);
}

const targetFile = process.argv[2];
makeExecutable(targetFile);