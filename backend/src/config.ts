export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.MIDMINE_JWT_SECRET ?? 'change-this-midmine-secret',
  adminEmail: process.env.MIDMINE_ADMIN_EMAIL ?? 'admin@midmine.local',
  adminPassword: process.env.MIDMINE_ADMIN_PASSWORD ?? 'midmine-admin',
  accessTokenMinutes: 15,
  refreshTokenDays: 30,
  cookieName: 'midmine_admin',
  databaseUrl: process.env.DATABASE_URL ?? process.env.MIDMINE_DATABASE_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
