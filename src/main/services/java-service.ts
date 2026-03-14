import { accessSync, constants, existsSync, mkdirSync } from 'node:fs';
import { readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { JavaRuntimeStatus, LauncherSettings } from '@shared/types';

const execFileAsync = promisify(execFile);

export class JavaService {
  constructor(private readonly runtimeDir: string) {
    mkdirSync(this.runtimeDir, { recursive: true });
  }

  async detectJava(settings: LauncherSettings, requiredMajor?: number): Promise<string | null> {
    const detected = await this.detectJavaStatus(settings, requiredMajor);
    return detected.javaPath;
  }

  async detectJavaStatus(settings: LauncherSettings, requiredMajor?: number): Promise<JavaRuntimeStatus> {
    const candidates = [
      { path: settings.javaPath, source: 'configured' as const },
      { path: join(process.resourcesPath, 'java', 'bin', 'java.exe'), source: 'bundled' as const },
      { path: process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java.exe') : null, source: 'system' as const },
      { path: join(this.runtimeDir, `java-${requiredMajor ?? 21}`, 'bin', 'java.exe'), source: 'downloaded' as const },
    ];

    for (const candidate of candidates) {
      if (!candidate.path || !this.isExecutable(candidate.path)) continue;
      const majorVersion = await this.getJavaMajor(candidate.path);
      if (!requiredMajor || majorVersion === null || majorVersion >= requiredMajor) {
        return { javaPath: candidate.path, source: candidate.source, majorVersion };
      }
    }

    try {
      const { stdout } = await execFileAsync('where.exe', ['java']);
      const entries = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const entry of entries) {
        if (!this.isExecutable(entry)) continue;
        const majorVersion = await this.getJavaMajor(entry);
        if (!requiredMajor || majorVersion === null || majorVersion >= requiredMajor) {
          return { javaPath: entry, source: 'system', majorVersion };
        }
      }
    } catch {
      return { javaPath: null, source: 'missing', majorVersion: null };
    }

    return { javaPath: null, source: 'missing', majorVersion: null };
  }

  async ensureJavaForVersion(settings: LauncherSettings, minecraftVersion: string) {
    const requiredMajor = this.getRequiredJavaMajor(minecraftVersion);
    const detected = await this.detectJavaStatus(settings, requiredMajor);
    if (detected.javaPath) return { ...detected, requiredMajor };

    const javaPath = await this.downloadRuntime(requiredMajor);
    return {
      javaPath,
      source: 'downloaded' as const,
      majorVersion: requiredMajor,
      requiredMajor,
    };
  }

  getRequiredJavaMajor(minecraftVersion: string) {
    const parts = minecraftVersion.split('.').map((part) => Number(part || 0));
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;
    if (major > 1) return 21;
    if (minor >= 21) return 21;
    if (minor === 20 && patch >= 5) return 21;
    if (minor >= 18) return 17;
    if (minor === 17) return 16;
    return 8;
  }

  private async downloadRuntime(major: number) {
    const response = await fetch(
      `https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse`,
    );
    if (!response.ok) {
      throw new Error(`Не удалось получить ссылку на Java ${major}`);
    }
    const releases = await response.json() as Array<{
      binary?: { package?: { link?: string; name?: string } };
    }>;
    const asset = releases.find((item) => item.binary?.package?.link)?.binary?.package;
    if (!asset?.link || !asset.name) {
      throw new Error(`Для Java ${major} не найден runtime package`);
    }

    const targetDir = join(this.runtimeDir, `java-${major}`);
    const archivePath = join(this.runtimeDir, asset.name);
    await rm(targetDir, { recursive: true, force: true });

    const archiveResponse = await fetch(asset.link);
    if (!archiveResponse.ok) {
      throw new Error(`Не удалось скачать Java ${major}`);
    }
    const archiveBuffer = Buffer.from(await archiveResponse.arrayBuffer());
    await writeFile(archivePath, archiveBuffer);

    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path "${archivePath}" -DestinationPath "${targetDir}" -Force`,
    ]);

    const extractedRoot = await this.findJavaRoot(targetDir);
    const javaPath = join(extractedRoot, 'bin', 'java.exe');
    if (!this.isExecutable(javaPath)) {
      throw new Error(`Java ${major} распакована, но java.exe не найдена`);
    }
    return javaPath;
  }

  private async findJavaRoot(targetDir: string) {
    const direct = join(targetDir, 'bin', 'java.exe');
    if (this.isExecutable(direct)) return targetDir;

    const entries = await readdir(targetDir, { withFileTypes: true });
    const firstDirectory = entries.find((entry) => entry.isDirectory());
    if (!firstDirectory) return targetDir;
    return join(targetDir, firstDirectory.name);
  }

  private async getJavaMajor(javaPath: string) {
    try {
      const { stderr, stdout } = await execFileAsync(javaPath, ['-version']);
      const source = `${stderr}\n${stdout}`;
      const match = source.match(/version "(\d+)(?:\.(\d+))?/);
      if (!match) return null;
      const raw = Number(match[1]);
      return raw === 1 ? Number(match[2] ?? 8) : raw;
    } catch {
      return null;
    }
  }

  private isExecutable(filePath: string) {
    try {
      if (!existsSync(filePath)) return false;
      accessSync(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
