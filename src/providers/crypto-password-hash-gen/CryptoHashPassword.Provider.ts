import { Env } from "env";
import { createHash } from "crypto";

const salt = Env.Security.SALT_FOR_HASH;

function HashPassword(password: string): string {
  return createHash('sha256').update(`${password}_${salt}`).digest('hex');
}

function IsPasswordMatch(hash: string, password: string): boolean {
  return hash === HashPassword(password);
}

export { HashPassword, IsPasswordMatch }