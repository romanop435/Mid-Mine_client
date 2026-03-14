import express from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { config } from './config.js';
import { BackendDatabase } from './db.js';
import { renderAdminLogin, renderAdminNews } from './templates.js';
import { signAccessToken, verifyAccessToken, verifyPassword } from './security.js';
const app = express();
const db = new BackendDatabase();
const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(24),
    password: z.string().min(6).max(128),
});
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
const newsSchema = z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    excerpt: z.string().min(1),
    content: z.string().min(1),
    coverImage: z.string().url().optional().or(z.literal('')).or(z.null()),
    publishedAt: z.string().min(1),
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
async function issueTokens(user) {
    const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
    });
    const refresh = await db.createRefreshSession(user.id);
    return {
        accessToken,
        refreshToken: refresh.token,
        refreshExpiresAt: refresh.expiresAt,
        user,
    };
}
async function sendAuth(response, user) {
    const session = await issueTokens(user);
    return response.json(session);
}
async function requireBearerUser(request, response, next) {
    const raw = request.header('authorization');
    if (!raw?.startsWith('Bearer ')) {
        response.status(401).json({ error: 'Authorization Bearer token required' });
        return;
    }
    try {
        const token = raw.slice('Bearer '.length);
        const payload = verifyAccessToken(token);
        const user = await db.getUserById(payload.userId);
        if (!user) {
            response.status(401).json({ error: 'User not found' });
            return;
        }
        request.user = user;
        next();
    }
    catch {
        response.status(401).json({ error: 'Invalid access token' });
    }
}
async function requireAdminCookie(request, response, next) {
    const token = request.cookies?.[config.cookieName];
    if (!token) {
        response.redirect('/admin/login');
        return;
    }
    try {
        const payload = verifyAccessToken(token);
        const user = await db.getUserById(payload.userId);
        if (!user || user.role !== 'admin') {
            response.clearCookie(config.cookieName);
            response.redirect('/admin/login');
            return;
        }
        request.admin = user;
        next();
    }
    catch {
        response.clearCookie(config.cookieName);
        response.redirect('/admin/login');
    }
}
app.get('/', (_request, response) => {
    response.type('html').send(`
    <h1>Mid-Mine Backend</h1>
    <p>REST API for launcher auth and news.</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/api/news">/api/news</a></li>
      <li><a href="/admin/login">/admin/login</a></li>
    </ul>
  `);
});
app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'mid-mine-backend', time: new Date().toISOString() });
});
app.post('/api/auth/register', async (request, response) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
        return;
    }
    try {
        const user = await db.createUser(parsed.data);
        if (!user) {
            response.status(500).json({ error: 'Failed to create user' });
            return;
        }
        await sendAuth(response, user);
    }
    catch (error) {
        response.status(409).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
});
app.post('/api/auth/login', async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
        return;
    }
    const row = await db.getUserByEmail(parsed.data.email);
    if (!row || !verifyPassword(parsed.data.password, row.password_salt, row.password_hash)) {
        response.status(401).json({ error: 'Неверный email или пароль' });
        return;
    }
    const user = await db.getUserById(row.id);
    if (!user) {
        response.status(404).json({ error: 'User not found' });
        return;
    }
    await sendAuth(response, user);
});
app.post('/api/auth/refresh', async (request, response) => {
    const token = typeof request.body?.refreshToken === 'string' ? request.body.refreshToken : '';
    if (!token) {
        response.status(400).json({ error: 'refreshToken is required' });
        return;
    }
    const user = await db.consumeRefreshToken(token);
    if (!user) {
        response.status(401).json({ error: 'Refresh token expired or invalid' });
        return;
    }
    await sendAuth(response, user);
});
app.get('/api/auth/me', requireBearerUser, (request, response) => {
    response.json({ user: request.user });
});
app.get('/api/news', async (_request, response) => {
    response.json({
        articles: (await db.listNews()).map((article) => ({
            id: article.id,
            title: article.title,
            category: article.category,
            excerpt: article.excerpt,
            content: article.content,
            coverImage: article.coverImage,
            publishedAt: article.publishedAt,
        })),
    });
});
app.get('/api/news/:id', async (request, response) => {
    const article = await db.getNewsById(request.params.id);
    if (!article) {
        response.status(404).json({ error: 'News not found' });
        return;
    }
    response.json(article);
});
app.get('/admin/login', (_request, response) => {
    response.type('html').send(renderAdminLogin());
});
app.post('/admin/login', async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).type('html').send(renderAdminLogin('Некорректная форма входа'));
        return;
    }
    const row = await db.getUserByEmail(parsed.data.email);
    if (!row || row.role !== 'admin' || !verifyPassword(parsed.data.password, row.password_salt, row.password_hash)) {
        response.status(401).type('html').send(renderAdminLogin('Неверный email или пароль администратора'));
        return;
    }
    const user = await db.getUserById(row.id);
    if (!user) {
        response.status(404).type('html').send(renderAdminLogin('Администратор не найден'));
        return;
    }
    const token = signAccessToken({ userId: user.id, email: user.email, username: user.username, role: 'admin' });
    response.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 8 * 60 * 60 * 1000,
    });
    response.redirect('/admin/news');
});
app.post('/admin/logout', (_request, response) => {
    response.clearCookie(config.cookieName);
    response.redirect('/admin/login');
});
app.get('/admin/news', requireAdminCookie, async (request, response) => {
    const admin = request.admin;
    const editingId = typeof request.query.edit === 'string' ? request.query.edit : null;
    const editing = editingId ? await db.getNewsById(editingId) : null;
    response.type('html').send(renderAdminNews({
        adminEmail: admin.email,
        articles: await db.listNews(),
        editing,
    }));
});
app.post('/admin/news', requireAdminCookie, async (request, response) => {
    const parsed = newsSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).send('Invalid news payload');
        return;
    }
    await db.saveNews({
        title: parsed.data.title,
        category: parsed.data.category,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        coverImage: parsed.data.coverImage || null,
        publishedAt: parsed.data.publishedAt,
    });
    response.redirect('/admin/news');
});
app.post('/admin/news/:id', requireAdminCookie, async (request, response) => {
    const articleId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    if (!articleId) {
        response.status(400).send('Missing news id');
        return;
    }
    const parsed = newsSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).send('Invalid news payload');
        return;
    }
    await db.saveNews({
        id: articleId,
        title: parsed.data.title,
        category: parsed.data.category,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        coverImage: parsed.data.coverImage || null,
        publishedAt: parsed.data.publishedAt,
    });
    response.redirect('/admin/news');
});
app.post('/admin/news/:id/delete', requireAdminCookie, async (request, response) => {
    const articleId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    if (!articleId) {
        response.status(400).send('Missing news id');
        return;
    }
    await db.deleteNews(articleId);
    response.redirect('/admin/news');
});
await db.initialize();
app.listen(config.port, config.host, () => {
    console.log(`Mid-Mine backend listening on http://${config.host}:${config.port}`);
});
