import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { config } from './config.js';
import { hashPassword, hashToken, makeRefreshToken, makeSalt } from './security.js';
function isoNow() {
    return new Date().toISOString();
}
export class BackendDatabase {
    pool;
    constructor() {
        if (!config.databaseUrl) {
            throw new Error('DATABASE_URL is required for PostgreSQL backend');
        }
        this.pool = new Pool({
            connectionString: config.databaseUrl,
            ssl: config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1')
                ? false
                : { rejectUnauthorized: false },
        });
    }
    async initialize() {
        await this.migrate();
        await this.seedAdmin();
    }
    async migrate() {
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        premium BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        cover_image TEXT,
        published_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users ((lower(email)));
      CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users ((lower(username)));
      CREATE INDEX IF NOT EXISTS idx_news_published_at ON news (published_at DESC);
    `);
    }
    async seedAdmin() {
        const existing = await this.pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
        if (existing.rowCount && existing.rows[0])
            return;
        const salt = makeSalt();
        const now = isoNow();
        await this.pool.query(`
        INSERT INTO users (id, email, username, password_hash, password_salt, role, premium, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'admin', TRUE, $6, $7)
      `, [
            randomUUID(),
            config.adminEmail.toLowerCase(),
            'MidMineAdmin',
            hashPassword(config.adminPassword, salt),
            salt,
            now,
            now,
        ]);
    }
    async createUser(input) {
        const email = input.email.trim().toLowerCase();
        const username = input.username.trim();
        const duplicateEmail = await this.pool.query('SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
        if (duplicateEmail.rowCount)
            throw new Error('Email уже зарегистрирован');
        const duplicateUsername = await this.pool.query('SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1', [username]);
        if (duplicateUsername.rowCount)
            throw new Error('Ник уже занят');
        const salt = makeSalt();
        const now = isoNow();
        const id = randomUUID();
        await this.pool.query(`
        INSERT INTO users (id, email, username, password_hash, password_salt, role, premium, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'user', FALSE, $6, $7)
      `, [id, email, username, hashPassword(input.password, salt), salt, now, now]);
        return this.getUserById(id);
    }
    async getUserByEmail(email) {
        const result = await this.pool.query(`
        SELECT id, email, username, password_hash, password_salt, role, premium, created_at, updated_at
        FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1
      `, [email]);
        return result.rows[0] ?? null;
    }
    async getUserById(id) {
        const result = await this.pool.query(`
        SELECT id, email, username, role, premium, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `, [id]);
        const row = result.rows[0];
        if (!row)
            return null;
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            role: row.role,
            premium: row.premium,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async createRefreshSession(userId) {
        const token = makeRefreshToken();
        const tokenHash = hashToken(token);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.refreshTokenDays * 24 * 60 * 60 * 1000).toISOString();
        await this.pool.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [randomUUID(), userId, tokenHash, expiresAt, isoNow()]);
        return { token, expiresAt };
    }
    async consumeRefreshToken(token) {
        const tokenHash = hashToken(token);
        const result = await this.pool.query(`
        SELECT id, user_id, expires_at
        FROM refresh_tokens
        WHERE token_hash = $1
        LIMIT 1
      `, [tokenHash]);
        const row = result.rows[0];
        if (!row)
            return null;
        await this.pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        if (new Date(row.expires_at).getTime() <= Date.now())
            return null;
        return this.getUserById(row.user_id);
    }
    async listNews() {
        const result = await this.pool.query(`
        SELECT id, title, category, excerpt, content, cover_image, published_at, created_at, updated_at
        FROM news
        ORDER BY published_at DESC, created_at DESC
      `);
        return result.rows.map((row) => ({
            id: row.id,
            title: row.title,
            category: row.category,
            excerpt: row.excerpt,
            content: row.content,
            coverImage: row.cover_image,
            publishedAt: row.published_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }
    async getNewsById(id) {
        const result = await this.pool.query(`
        SELECT id, title, category, excerpt, content, cover_image, published_at, created_at, updated_at
        FROM news
        WHERE id = $1
        LIMIT 1
      `, [id]);
        const row = result.rows[0];
        if (!row)
            return null;
        return {
            id: row.id,
            title: row.title,
            category: row.category,
            excerpt: row.excerpt,
            content: row.content,
            coverImage: row.cover_image,
            publishedAt: row.published_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async saveNews(input) {
        const id = input.id ?? randomUUID();
        const now = isoNow();
        await this.pool.query(`
        INSERT INTO news (id, title, category, excerpt, content, cover_image, published_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          cover_image = EXCLUDED.cover_image,
          published_at = EXCLUDED.published_at,
          updated_at = EXCLUDED.updated_at
      `, [id, input.title, input.category, input.excerpt, input.content, input.coverImage ?? null, input.publishedAt, now, now]);
        return this.getNewsById(id);
    }
    async deleteNews(id) {
        await this.pool.query('DELETE FROM news WHERE id = $1', [id]);
    }
}
