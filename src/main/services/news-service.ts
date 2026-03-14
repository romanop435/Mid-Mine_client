import { NEWS_FEED_ENV } from '@shared/constants';
import { LauncherDatabase } from './database';
import { ProgressionService } from './progression-service';
import type { NewsArticle } from '@shared/types';

type RemoteNewsPayload = {
  articles: Array<{
    id: string;
    title: string;
    category: string;
    excerpt: string;
    content: string;
    coverImage?: string | null;
    publishedAt: string;
  }>;
};

export class NewsService {
  private syncInFlight: Promise<void> | null = null;

  constructor(
    private readonly db: LauncherDatabase,
    private readonly progression: ProgressionService,
  ) {}

  async syncRemote() {
    const feedUrl = process.env[NEWS_FEED_ENV];
    if (!feedUrl) return;
    if (this.syncInFlight) return this.syncInFlight;

    this.syncInFlight = (async () => {
      const response = await fetch(feedUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Не удалось получить новости: ${response.status}`);
      }
      const payload = await response.json() as RemoteNewsPayload;
      const articles = payload.articles.map((article) => ({
        id: article.id,
        title: article.title,
        category: article.category,
        excerpt: article.excerpt,
        content: article.content,
        coverImage: article.coverImage ?? null,
        publishedAt: article.publishedAt,
      })) satisfies Omit<NewsArticle, 'readAt'>[];
      this.db.replaceNews(articles);
    })().finally(() => {
      this.syncInFlight = null;
    });

    return this.syncInFlight;
  }

  async list(profileId: string) {
    await this.syncRemote().catch(() => undefined);
    return this.db.listNews(profileId);
  }

  async open(profileId: string, articleId: string) {
    await this.syncRemote().catch(() => undefined);
    const didRead = this.db.markNewsRead(profileId, articleId);
    if (didRead) {
      this.progression.record(
        profileId,
        'read_news',
        1,
        articleId,
        'news',
        'Новость прочитана',
        'Прогресс и XP обновлены за чтение новости',
      );
    }
    return this.db.listNews(profileId);
  }
}
