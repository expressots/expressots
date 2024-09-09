/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

import { LINE_REGEX } from "./constants";
import { IConfigOptions, IConfigOutput, IEnvObject } from "./interfaces";
import { log, LogLevel } from "../utils/logger";

/**
 * Module to parse the .env.vault file
 * @param options - The configuration options
 * @returns The parsed object
 */
function _parseVault(options: IConfigOptions): IEnvObject {
  const vaultPath = _vaultPath(options);

  const result = configDotenv({ path: vaultPath });
  if (!result.parsed) {
    const err: Error = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
    err.name = "MISSING_DATA";
    throw err;
  }

  //DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod, // dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  const keys = _dotenvKey(options).split(",");
  const length = keys.length;

  let decrypted: string = "";
  for (let i = 0; i < length; i++) {
    try {
      const key = keys[i].trim();
      const attrs = _instructions(result, key);
      decrypted = decrypt(attrs.ciphertext, attrs.key);
      break;
    } catch (error) {
      if (i + 1 >= length) {
        throw error;
      }
    }
  }
  return parse(decrypted);
}

/**
 * Module to verify and return the .env.vault file path
 * @param options - The configuration options
 * @returns The .env.vault file path
 */
function _vaultPath(options) {
  let possibleVaultPath = null;

  if (options && options.path && options.path.length > 0) {
    if (Array.isArray(options.path)) {
      for (const filepath of options.path) {
        if (fs.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
        }
      }
    } else {
      possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
    }
  } else {
    possibleVaultPath = path.resolve(process.cwd(), ".env.vault");
  }

  if (fs.existsSync(possibleVaultPath)) {
    return possibleVaultPath;
  }

  return null;
}

/**
 * Module to verify and return the DOTENV_KEY vault key
 * @param options - The configuration options
 * @returns The DOTENV_KEY as a string
 */
function _dotenvKey(options?: IConfigOptions): string {
  if (options && options.vaultEnvKey && options.vaultEnvKey.length > 0) {
    return options.vaultEnvKey;
  }

  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY;
  }

  return "";
}

/**
 * Module to get instructions for decrypting the .env.vault file
 * @param result -
 * @param dotenvKey
 * @returns
 */
function _instructions(result: IConfigOutput, dotenvKey: string) {
  let uri = null;

  try {
    uri = new URL(dotenvKey);
  } catch (error: any) {
    if (error.code === "ERR_INVALID_URL") {
      const err: any = new Error(
        "INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development",
      );
      err.code = "INVALID_DOTENV_KEY";
      throw err;
    }

    throw error;
  }

  // Get decrypt key
  const key = uri.password;
  if (!key) {
    const err: any = new Error("INVALID_DOTENV_KEY: Missing key part");
    err.code = "INVALID_DOTENV_KEY";
    throw err;
  }

  // Get environment
  const environment = uri.searchParams.get("environment");
  if (!environment) {
    const err: any = new Error("INVALID_DOTENV_KEY: Missing environment part");
    err.code = "INVALID_DOTENV_KEY";
    throw err;
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
  const ciphertext = result.parsed[environmentKey]; // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    const err: any = new Error(
      `NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`,
    );
    err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
    throw err;
  }

  return { ciphertext, key };
}

/**
 * Module responsible to resolve home path
 * @param envPath - The path to resolve
 * @returns The resolved path
 */
function _resolveHome(envPath: string): string {
  return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
}

/**
 * Module to load environment variables from .env.vault file
 * @param options - The configuration options
 * @returns The parsed object
 */
export function _configVault(options: IConfigOptions): IConfigOutput {
  log("Loading env from encrypted .env.vault");

  const parsed = _parseVault(options);

  let processEnv = process.env;
  if (options && options.envObject != null) {
    processEnv = options.envObject;
  }

  populate(processEnv, parsed, options);

  return { parsed };
}

/**
 * Module to load environment variables from .env file
 * @param options - The configuration options
 * @returns The parsed object
 * @public API
 */
export function config(options?: IConfigOptions): IConfigOutput {
  if (_dotenvKey(options).length === 0) {
    return configDotenv(options);
  }

  const vaultPath = _vaultPath(options);
  console.log(vaultPath);
  if (!vaultPath) {
    log(
      `You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`,
      LogLevel.Warn,
    );
    return configDotenv(options);
  }

  return _configVault(options);
}

/**
 * Module to load environment variables from .env file
 * @param options - The configuration options
 * @returns The parsed object
 * @public API
 */
export function configDotenv(options?: IConfigOptions): IConfigOutput {
  const dotenvPath = path.resolve(process.cwd(), String(options?.path ?? ".env"));

  const encoding: BufferEncoding = (options.encoding ?? "utf8") as BufferEncoding;
  const debug = !!options.debug;
  const paths = Array.isArray(options.path)
    ? options.path.map(_resolveHome)
    : [_resolveHome(dotenvPath)];

  const parsed: IEnvObject = {};
  let lastError: Error | undefined;

  for (const envPath of paths) {
    try {
      const fileContent = fs.readFileSync(envPath, { encoding });
      const parsedContent = parse(fileContent);
      populate(process.env, parsedContent, options);
    } catch (error: any) {
      lastError = error;
      if (debug) {
        log(`Failed to load ${envPath} file with error: ${error.message}`, LogLevel.Debug);
      }
    }
  }
  return { parsed, error: lastError };
}

/**
 * Module to load environment variables from .env file
 * @param envFile - The source of the .env file
 * @returns The parsed object
 * @public API
 */
export function parse(envFile: Buffer | string): Record<string, string> {
  const obj: Record<string, string> = {};

  const lines = envFile.toString().replace(/\r\n?/gm, "\n");

  let match: RegExpExecArray | null;

  while ((match = LINE_REGEX.exec(lines)) != null) {
    const key = match[1].trim();
    let value = match[2]?.trim() ?? "";

    if (["'", '"', "`"].includes(value[0])) {
      value = value.slice(1, -1);
    }

    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

    if (match[2]?.[0] === '"') {
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }

    obj[key] = value;
  }

  return obj;
}

/**
 * Decrypts a base64 encoded string
 * @param encrypted - The base64 encoded string to decrypt
 * @param keyStr - The key to use for decryption
 * @returns The decrypted string
 * @public API
 */
export function decrypt(encrypted: string, keyStr: string): string {
  const key = Buffer.from(keyStr.slice(-64), "hex");
  let ciphertext = Buffer.from(encrypted, "base64");

  const nonce = ciphertext.subarray(0, 12);
  const authTag = ciphertext.subarray(-16);
  ciphertext = ciphertext.subarray(12, -16);

  try {
    const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    aesgcm.setAuthTag(authTag);
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
  } catch (error: any) {
    const isRange = error instanceof RangeError;
    const invalidKeyLength = error.message === "Invalid key length";
    const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";

    if (isRange || invalidKeyLength) {
      const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
      err.name = "INVALID_DOTENV_KEY";
      throw err;
    } else if (decryptionFailed) {
      const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
      err.name = "DECRYPTION_FAILED";
      throw err;
    } else {
      throw error;
    }
  }
}

/**
 * Populates the environment with the given parsed object
 * @param envObject - The object to populate the environment with (e.g. process.env)
 * @param parsed - The parsed object
 * @param options - The configuration options
 * @public API
 */
export function populate(
  envObject: IEnvObject, // Usually process.env
  parsed: IEnvObject,
  options: IConfigOptions = {},
): void {
  const debug = Boolean(options && options.debug);
  const override = Boolean(options && options.override);

  if (typeof parsed !== "object") {
    const err = new Error(
      "OBJECT_REQUIRED: Please check the processEnv argument being passed to populate",
    );
    err.name = "OBJECT_REQUIRED";
    throw err;
  }

  // Set process.env (envObject)
  for (const key of Object.keys(parsed)) {
    const parsedValue = parsed[key];

    // Decide whether to override existing env var or not
    if (Object.prototype.hasOwnProperty.call(envObject, key)) {
      if (override) {
        envObject[key] = parsedValue;
        if (debug) {
          log(`"${key}" was overwritten to "${parsedValue}"`, LogLevel.Debug);
        }
      } else if (debug) {
        log(`"${key}" was NOT overwritten (already exists)`, LogLevel.Debug);
      }
    } else {
      // Variable doesn't exist in process.env, so set it
      envObject[key] = parsedValue;
      if (debug) {
        log(`"${key}" was set to "${parsedValue}"`, LogLevel.Debug);
      }
    }
  }

  // Final debug log to ensure variables are correctly populated
  if (debug) {
    console.log("Final process.env object:", envObject);
  }
}
