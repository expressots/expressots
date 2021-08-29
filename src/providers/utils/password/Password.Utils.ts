// src/utils/password/Password.Utils.ts
import {createHash} from 'crypto';

const salt = 'private salt';

export function hashPassword(password: string): string {
  return createHash('sha256').update(`${password}_${salt}`).digest('hex');
}

export function isPasswordMatch(hash: string, password: string): boolean {
  return hash === hashPassword(password);
}