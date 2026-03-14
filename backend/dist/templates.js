function layout(title, body) {
    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #081017;
      --bg-soft: rgba(255,255,255,0.05);
      --border: rgba(255,255,255,0.08);
      --text: #f5f5f5;
      --muted: #9ca3af;
      --accent: #22c55e;
      --accent-2: #06b6d4;
      --danger: #f97316;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 15% 10%, rgba(34,197,94,0.18), transparent 25%),
        radial-gradient(circle at 85% 20%, rgba(6,182,212,0.16), transparent 30%),
        linear-gradient(180deg, #04070d, #081017);
      color: var(--text);
    }
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 20px 60px; }
    .hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 24px; }
    .brand { font-size: 32px; font-weight: 700; }
    .muted { color: var(--muted); }
    .card {
      background: var(--bg-soft);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 20px;
      backdrop-filter: blur(24px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    .grid { display: grid; gap: 16px; }
    .grid-2 { grid-template-columns: 1.1fr 1fr; }
    input, textarea, select {
      width: 100%;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.05);
      color: var(--text);
      padding: 12px 14px;
      font: inherit;
    }
    textarea { min-height: 120px; resize: vertical; }
    label { display: block; margin-bottom: 12px; }
    label span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 14px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    button, .button {
      appearance: none;
      border: 1px solid rgba(34,197,94,0.28);
      background: linear-gradient(135deg, rgba(34,197,94,0.85), rgba(16,185,129,0.72));
      color: white;
      border-radius: 16px;
      padding: 10px 16px;
      font: inherit;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .secondary {
      background: rgba(255,255,255,0.05);
      border-color: var(--border);
    }
    .danger {
      background: rgba(249,115,22,0.14);
      border-color: rgba(249,115,22,0.22);
      color: #fed7aa;
    }
    .list { display: grid; gap: 14px; margin-top: 18px; }
    .news-item { padding: 18px; border-radius: 20px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); }
    .topline { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .badge {
      display: inline-flex; align-items: center; padding: 4px 10px;
      border-radius: 999px; background: rgba(6,182,212,0.12); color: #67e8f9; border: 1px solid rgba(6,182,212,0.2);
      font-size: 12px;
    }
    .spacer { height: 10px; }
  </style>
</head>
<body>
  <div class="page">${body}</div>
</body>
</html>`;
}
export function renderAdminLogin(error) {
    return layout('Mid-Mine Admin Login', `
      <div class="hero">
        <div>
          <div class="brand">Mid-Mine Admin</div>
          <div class="muted">Вход в панель новостей</div>
        </div>
      </div>
      <div class="card" style="max-width: 520px;">
        ${error ? `<div style="margin-bottom: 16px; color: #fecaca;">${error}</div>` : ''}
        <form method="post" action="/admin/login">
          <label><span>Email</span><input name="email" type="email" required /></label>
          <label><span>Пароль</span><input name="password" type="password" required /></label>
          <div class="actions">
            <button type="submit">Войти</button>
          </div>
        </form>
      </div>
    `);
}
export function renderAdminNews(params) {
    const editing = params.editing;
    const action = editing ? `/admin/news/${editing.id}` : '/admin/news';
    return layout('Mid-Mine Admin', `
      <div class="hero">
        <div>
          <div class="brand">Mid-Mine News Admin</div>
          <div class="muted">Авторизован как ${params.adminEmail}</div>
        </div>
        <form method="post" action="/admin/logout"><button class="secondary" type="submit">Выйти</button></form>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">${editing ? 'Редактировать новость' : 'Новая новость'}</div>
          <form method="post" action="${action}">
            <label><span>Заголовок</span><input name="title" value="${editing?.title ?? ''}" required /></label>
            <label><span>Категория</span><input name="category" value="${editing?.category ?? 'Launcher'}" required /></label>
            <label><span>Краткое описание</span><textarea name="excerpt" required>${editing?.excerpt ?? ''}</textarea></label>
            <label><span>Полный текст</span><textarea name="content" required>${editing?.content ?? ''}</textarea></label>
            <label><span>Cover image URL</span><input name="coverImage" value="${editing?.coverImage ?? ''}" /></label>
            <label><span>Дата публикации ISO</span><input name="publishedAt" value="${editing?.publishedAt ?? new Date().toISOString()}" required /></label>
            <div class="actions">
              <button type="submit">${editing ? 'Сохранить' : 'Опубликовать'}</button>
              ${editing ? '<a class="button secondary" href="/admin/news">Отмена</a>' : ''}
            </div>
          </form>
        </div>
        <div class="card">
          <div style="font-size: 22px; font-weight: 700;">Публичный feed</div>
          <div class="spacer"></div>
          <div class="muted">Launcher endpoint: <code>/api/news</code></div>
          <div class="spacer"></div>
          <div class="muted">Для лаунчера укажи <code>MIDMINE_NEWS_FEED_URL=http://your-host:8787/api/news</code></div>
        </div>
      </div>
      <div class="card" style="margin-top: 18px;">
        <div style="font-size: 22px; font-weight: 700;">Опубликованные новости</div>
        <div class="list">
          ${params.articles.map((article) => `
            <div class="news-item">
              <div class="topline">
                <div>
                  <div style="font-size: 18px; font-weight: 700;">${article.title}</div>
                  <div class="muted">${article.publishedAt}</div>
                </div>
                <span class="badge">${article.category}</span>
              </div>
              <div class="muted">${article.excerpt}</div>
              <div class="actions" style="margin-top: 14px;">
                <a class="button secondary" href="/admin/news?edit=${article.id}">Редактировать</a>
                <form method="post" action="/admin/news/${article.id}/delete" onsubmit="return confirm('Удалить новость?')">
                  <button class="danger" type="submit">Удалить</button>
                </form>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
}
