import { expect, test } from '@playwright/test';
import { getPort, killProcess, runDevCommand } from '../../utils/runCommands';

const appDir = __dirname;

test.describe('home pageType', async () => {
  let appPort: number;
  let app: unknown;
  test.beforeAll(async () => {
    appPort = await getPort();
    app = await runDevCommand(appDir, appPort);
  });

  test.afterAll(async () => {
    if (app) {
      await killProcess(app);
    }
  });

  test('Hero', async ({ page }) => {
    await page.goto(`http://localhost:${appPort}`);
    await expect(page.locator('h1').textContent()).resolves.toBe(
      'E2E case title',
    );
    await expect(
      page.locator('.rspress-home-hero-text').textContent(),
    ).resolves.toBe('E2E case subTitle');
    await expect(
      page.locator('.rspress-home-hero-tagline').textContent(),
    ).resolves.toBe('E2E case tagline');

    const img = page.locator('.rspress-home-hero-image img').first();
    await expect(img.getAttribute('src')).resolves.toBe('/brand.png');
    await expect(img.getAttribute('alt')).resolves.toBe('E2E case brand image');
    await expect(img.getAttribute('srcset')).resolves.toBe(
      '/brand.png, /brand@2x.png 2x',
    );
    await expect(img.getAttribute('sizes')).resolves.toBe(
      '((min-width: 50em) and (max-width: 60em)) 50em, (max-width: 30em) 20em',
    );

    // todo: add tests for hero actions
  });

  test('Features', async ({ page }) => {
    await page.goto(`http://localhost:${appPort}`);
    const features = await page.$$('.rspress-home-feature-card');
    expect(features).toHaveLength(2);

    const url1 = page.url();
    await features[0].click();
    expect(page.url()).toBe(url1);

    await features[1].click();
    expect(page.url()).toBe('https://example.com/');
  });
});
