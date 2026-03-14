import { createHash, randomBytes, scryptSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function makeSalt() {
  return randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  return hashPassword(password, salt) === expectedHash;
}

export function makeRefreshToken() {
  return randomBytes(48).toString('hex');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: { userId: string; email: string; username: string; role: 'user' | 'admin' }) {
  return jwt.sign(payload, config.jwtSecret, {
    issuer: 'midmine-backend',
    audience: 'midmine-launcher',
    expiresIn: `${config.accessTokenMinutes}m`,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'midmine-backend',
    audience: 'midmine-launcher',
  }) as {
    userId: string;
    email: string;
    username: string;
    role: 'user' | 'admin';
  };
}
