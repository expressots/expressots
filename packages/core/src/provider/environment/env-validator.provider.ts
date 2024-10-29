import fs from "fs";
import path from "path";
import { injectable } from "../../di/inversify";
import { Logger } from "../logger/logger.provider";
import { IProvider } from "../provider-manager";
import { parse } from "@expressots/shared";

type DefaultValueType = string | number | boolean | undefined;

/**
 * The EnvValidatorProvider class provides utility methods for working with environment variables.
 * It validates, loads, and retrieves environment variables from the .env file.
 * @provide EnvValidatorProvider
 */
@injectable()
export class EnvValidatorProvider implements IProvider {
  name: string = "EnvValidatorProvider";
  version: string = "0.0.1";
  author: string = "Richard Zampieri";
  repo: string = "https://github.com/expressots/expressots";

  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Retrieves the value of an environment variable, or a default value if the variable is not set.
   * @param key - The key of the environment variable.
   * @param defaultValue - The default value to return if the environment variable is not set.
   * @returns The value of the environment variable, or the default value if not set.
   * @public API
   */
  public get(
    key: string,
    defaultValue: DefaultValueType = undefined,
  ): DefaultValueType {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Validates and loads all environment variables from the .env file.
   * If the .env file does not exist or any environment variables are not set, the process will exit with an error.
   * @param envFile -  
   * @public API
   */
  public checkFile(envFile: string): void {
    // Get the full path of the .env file
    const envFilePath: string = path.join(process.cwd(), ".", envFile);

    // Check if the .env file exists
    if (!fs.existsSync(envFilePath)) {
      this.logger.error(
        `Environment file [${envFile}] is not defined.`,
        "environment-provider",
      );
      process.exit(1);
    }

    const dotEnvParsed = parse(fs.readFileSync(envFilePath, "utf8"));

    /* Verify if all environment variables are defined */
    let hasError: boolean = false;
    if (dotEnvParsed) {
      for (const key of Object.keys(dotEnvParsed)) {
        // Check if the environment variable is not defined or is an empty string
        if (!process.env[key] || process.env[key] === "") {
          this.logger.error(
            `Environment variable [ ${key} ] is not defined.`,
            "environment-provider",
          );
          hasError = true;
        }
      }
    }

    if (hasError) {
      process.exit(1);
    }
  }
}

declare global {
  interface String {
    AsBoolean(): boolean | undefined;
    AsNumber(): number | undefined;
    AsString(): string | undefined;
  }
}

String.prototype.AsBoolean = function (): boolean | undefined {
  switch (this.toLowerCase().trim()) {
    case "true":
    case "1":
    case "yes":
      return true;
    case "false":
    case "0":
    case "no":
      return false;
    default:
      return undefined;
  }
};

String.prototype.AsNumber = function (): number | undefined {
  return Number(this);
};

String.prototype.AsString = function (): string | undefined {
  return String(this);
};
