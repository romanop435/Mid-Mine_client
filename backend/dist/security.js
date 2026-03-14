import { createHash, randomBytes, scryptSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
export function makeSalt() {
    return randomBytes(16).toString('hex');
}
export function hashPassword(password, salt) {
    return scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, salt, expectedHash) {
    return hashPassword(password, salt) === expectedHash;
}
export function makeRefreshToken() {
    return randomBytes(48).toString('hex');
}
export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export function signAccessToken(payload) {
    return jwt.sign(payload, config.jwtSecret, {
        issuer: 'midmine-backend',
        audience: 'midmine-launcher',
        expiresIn: `${config.accessTokenMinutes}m`,
    });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, config.jwtSecret, {
        issuer: 'midmine-backend',
        audience: 'midmine-launcher',
    });
}
