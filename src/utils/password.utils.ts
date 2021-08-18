import {createHash} from 'crypto';

const _salt = "minha terra tem palmeiras onde canta o sabiá, seno a coseno b, seno b, coseno a.";

export function hashPassword(password: string, salt: string): string {
  salt = _salt;
  return createHash("sha256").update(`${password}_${salt}`).digest("hex");
}

export function isPasswordMatch(hash: string, password: string): boolean {
  return hash === hashPassword(password, _salt);
}