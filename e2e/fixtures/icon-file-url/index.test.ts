import { access } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { runBuildCommand } from '../../utils/runCommands';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test.describe('icon file url', async () => {
  test('should use specified file URL icon path', async () => {
    const appDir = __dirname;
    await runBuildCommand(appDir);

    const existsImg = pathExists(
      path.resolve(appDir, 'doc_build', 'rspress-icon.png'),
    );
    expect(existsImg).toBeTruthy();
  });
});
