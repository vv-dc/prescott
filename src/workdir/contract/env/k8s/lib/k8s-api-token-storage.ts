import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ensureDirectory } from '@src/lib/file.utils';

/**
 * Stores token on FS
 * Uses initial token to understand, if the old token
 * should be loaded, or the new was provided
 */
export class K8sApiTokenStorage {
  private tokenDirectory = 'data/k8s';

  constructor(
    private readonly workDir: string,
    private readonly initialToken: string
  ) {}

  ensureStorage(): Promise<void> {
    return ensureDirectory(this.tokenDirectory);
  }

  saveToken(newToken: string): Promise<void> {
    const tokenPath = this.buildTokenPath(this.initialToken);
    return fsp.writeFile(tokenPath, newToken);
  }

  async tryToLoadToken(): Promise<string | null> {
    const tokenPath = this.buildTokenPath(this.initialToken);
    try {
      const tokenContent = await fsp.readFile(tokenPath, 'utf-8');
      return tokenContent || null;
    } catch (err) {
      return null;
    }
  }

  private buildTokenPath(token: string): string {
    const hash = crypto.createHash('md5').update(token).digest('hex');
    return path.join(this.workDir, `${this.tokenDirectory}/token-${hash}.txt`);
  }
}
