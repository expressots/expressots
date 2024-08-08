import chalk from "chalk";

export function beautifyStackTrace(stack: string): string {
  if (!stack) return;

  const lines = stack.split("\n");

  const errorMessage = lines.shift()?.trim();

  const maxOriginLength = "[External Library]".length;

  const stackLines = lines
    .filter((line) => line.trim().startsWith("at"))
    .map((line) => line.trim())
    .map((line) => {
      const isExternalLib = line.includes("node_modules");
      const filePathMatch = line.match(/\((.*):(\d+):(\d+)\)/);
      const filePath = filePathMatch
        ? `${filePathMatch[1]}:${filePathMatch[2]}:${filePathMatch[3]}`
        : "";
      const stackMessage = line.replace(/\(.*\)/, "").trim();
      return {
        origin: isExternalLib
          ? chalk.gray("[External Library]").padEnd(maxOriginLength)
          : chalk.gray("[Application]     ").padEnd(maxOriginLength),
        stackMessage: chalk.green(stackMessage),
        filePath: chalk.white(filePath),
      };
    });

  if (stackLines.length > 0) {
    console.log(
      chalk.red.bold(
        `Error Originated From: ${chalk.bold.white(stackLines[0]?.filePath || "unknown")}`,
      ),
    );
  }

  console.log(chalk.red.bold(errorMessage));
  console.log(chalk.blue.bold("\nStack Trace:\n"));

  stackLines.forEach(({ origin, stackMessage, filePath }) => {
    console.log(`${origin} | ${stackMessage} | ${filePath}`);
  });

  return "";
}
