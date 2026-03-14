import { copyFile, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { extname, join } from 'node:path';
import { dialog, safeStorage } from 'electron';
import { PublicClientApplication, type AuthenticationResult } from '@azure/msal-node';
import { LauncherDatabase } from './database';
import type { AuthSession, LocalAccountInput, MicrosoftDeviceStart, Profile } from '@shared/types';

const MS_CLIENT_ID = process.env.MIDMINE_MS_CLIENT_ID ?? '00000000402b5328';
const MS_SCOPES = ['XboxLive.signin', 'offline_access'];

type PendingFlow = {
  promise: Promise<AuthenticationResult | null>;
};

export class AuthService {
  private readonly pca = new PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/consumers',
    },
  });

  private readonly pending = new Map<string, PendingFlow>();

  constructor(
    private readonly db: LauncherDatabase,
    private readonly baseDir: string,
  ) {}

  listProfiles() {
    return this.db.listProfiles();
  }

  registerLocalAccount(input: LocalAccountInput) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(input.password, salt);
    return this.db.createLocalProfile({
      email: input.email,
      username: input.username,
      passwordHash,
      passwordSalt: salt,
    });
  }

  loginLocalAccount(email: string, password: string) {
    const account = this.db.getLocalProfileByEmail(email);
    if (!account?.password_hash || !account.password_salt) {
      throw new Error('Аккаунт не найден');
    }

    const passwordHash = this.hashPassword(password, account.password_salt);
    if (passwordHash !== account.password_hash) {
      throw new Error('Неверный пароль');
    }

    return this.db.activateProfile(account.id);
  }

  setActiveProfile(profileId: string) {
    return this.db.setActiveProfile(profileId);
  }

  updateProfile(profile: Partial<Profile> & Pick<Profile, 'id'>) {
    this.db.updateProfile(profile);
    return this.db.listProfiles();
  }

  async pickAvatar(profileId: string) {
    const profile = this.db.listProfiles().find((entry) => entry.id === profileId);
    if (!profile) throw new Error('Профиль не найден');

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return this.db.listProfiles();

    const source = result.filePaths[0]!;
    const avatarDir = join(this.baseDir, 'avatars');
    await mkdir(avatarDir, { recursive: true });
    const filename = `${profileId}-${Date.now()}${extname(source) || '.png'}`;
    const target = join(avatarDir, filename);
    await copyFile(source, target);
    this.db.updateProfile({ id: profileId, avatarPath: target });
    return this.db.listProfiles();
  }

  logout(profileId: string) {
    this.db.clearAuthSession(profileId);
    this.db.clearActiveProfile();
    return this.db.listProfiles();
  }

  async beginMicrosoftLogin(): Promise<MicrosoftDeviceStart> {
    let deviceResponse: MicrosoftDeviceStart | null = null;
    const promise = this.pca.acquireTokenByDeviceCode({
      scopes: MS_SCOPES,
      deviceCodeCallback: (response) => {
        deviceResponse = {
          flowId: '',
          userCode: response.userCode,
          verificationUri: response.verificationUri,
          expiresIn: response.expiresIn,
          message: response.message,
        };
      },
    });

    const flowId = randomUUID();
    this.pending.set(flowId, { promise });

    while (!deviceResponse) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const response = deviceResponse as MicrosoftDeviceStart;
    return { ...response, flowId };
  }

  async completeMicrosoftLogin(flowId: string) {
    const flow = this.pending.get(flowId);
    if (!flow) throw new Error('Поток авторизации не найден');
    this.pending.delete(flowId);

    const result = await flow.promise;
    if (!result?.accessToken || !result.account) {
      throw new Error('Microsoft OAuth не вернул access token');
    }

    const tokenCache = this.pca.getTokenCache().serialize();
    const minecraft = await this.exchangeForMinecraftAccess(result.accessToken);
    const session: AuthSession = {
      profileId: '',
      accessToken: minecraft.minecraftToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      xuid: minecraft.xuid ?? undefined,
      uuid: minecraft.uuid,
      msaCache: tokenCache,
      homeAccountId: result.account.homeAccountId,
      email: result.account.username ?? null,
      username: minecraft.username,
    };

    const encryptedBlob = this.encrypt(JSON.stringify(session));
    return this.db.upsertMicrosoftProfile({
      username: minecraft.username,
      email: result.account.username ?? null,
      uuid: minecraft.uuid,
      xuid: minecraft.xuid ?? null,
      encryptedBlob,
      expiresAt: session.expiresAt,
    });
  }

  async getLaunchAuth(profile: Profile): Promise<AuthSession | null> {
    if (profile.type !== 'microsoft') return null;

    const row = this.db.db.prepare(`
      SELECT encrypted_blob
      FROM auth_tokens
      WHERE profile_id = ?
    `).get(profile.id) as { encrypted_blob: string } | undefined;
    if (!row) return null;

    const session = JSON.parse(this.decrypt(row.encrypted_blob)) as AuthSession;
    if (new Date(session.expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
      return { ...session, profileId: profile.id };
    }

    if (!session.msaCache || !session.homeAccountId) {
      return { ...session, profileId: profile.id };
    }

    const refreshPca = new PublicClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/consumers',
      },
    });
    refreshPca.getTokenCache().deserialize(session.msaCache);
    const account = await refreshPca.getTokenCache().getAccountByHomeId(session.homeAccountId);
    if (!account) return { ...session, profileId: profile.id };

    const refreshed = await refreshPca.acquireTokenSilent({
      account,
      scopes: MS_SCOPES,
    });
    if (!refreshed?.accessToken) return { ...session, profileId: profile.id };

    const minecraft = await this.exchangeForMinecraftAccess(refreshed.accessToken);
    const renewed: AuthSession = {
      ...session,
      profileId: profile.id,
      accessToken: minecraft.minecraftToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      uuid: minecraft.uuid,
      xuid: minecraft.xuid ?? undefined,
      username: minecraft.username,
      msaCache: refreshPca.getTokenCache().serialize(),
    };
    const encryptedBlob = this.encrypt(JSON.stringify(renewed));
    this.db.upsertMicrosoftProfile({
      username: renewed.username ?? minecraft.username,
      email: renewed.email ?? null,
      uuid: renewed.uuid ?? minecraft.uuid,
      xuid: renewed.xuid ?? null,
      encryptedBlob,
      expiresAt: renewed.expiresAt,
    });
    return renewed;
  }

  private hashPassword(password: string, salt: string) {
    return scryptSync(password, salt, 64).toString('hex');
  }

  private encrypt(raw: string) {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(raw).toString('base64');
    }
    return Buffer.from(raw, 'utf8').toString('base64');
  }

  private decrypt(raw: string) {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw, 'base64'));
    }
    return Buffer.from(raw, 'base64').toString('utf8');
  }

  private async exchangeForMinecraftAccess(msAccessToken: string) {
    const xblResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${msAccessToken}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });
    if (!xblResponse.ok) {
      throw new Error(`Xbox Live auth failed: ${xblResponse.status}`);
    }
    const xbl = await xblResponse.json() as {
      Token: string;
      DisplayClaims: { xui?: Array<{ uhs: string }> };
    };

    const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xbl.Token],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      }),
    });
    if (!xstsResponse.ok) {
      throw new Error(`XSTS auth failed: ${xstsResponse.status}`);
    }
    const xsts = await xstsResponse.json() as {
      Token: string;
      DisplayClaims: { xui?: Array<{ uhs: string; xid?: string }> };
    };

    const uhs = xsts.DisplayClaims.xui?.[0]?.uhs ?? xbl.DisplayClaims.xui?.[0]?.uhs;
    if (!uhs) throw new Error('Xbox user hash not returned');

    const minecraftAuthResponse = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${xsts.Token}`,
      }),
    });
    if (!minecraftAuthResponse.ok) {
      throw new Error(`Minecraft auth failed: ${minecraftAuthResponse.status}`);
    }
    const minecraftAuth = await minecraftAuthResponse.json() as {
      access_token: string;
    };

    const profileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: {
        Authorization: `Bearer ${minecraftAuth.access_token}`,
      },
    });
    if (!profileResponse.ok) {
      throw new Error(`Minecraft profile fetch failed: ${profileResponse.status}`);
    }
    const profile = await profileResponse.json() as { id: string; name: string };

    return {
      minecraftToken: minecraftAuth.access_token,
      username: profile.name,
      uuid: profile.id,
      xuid: xsts.DisplayClaims.xui?.[0]?.xid ?? null,
    };
  }
}
