import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TENANT_ADMIN = {
  email: 'playwright-test@maidar.com',
  password: 'PlaywrightTest123!'
};

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up global authentication...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for page to fully hydrate and form to appear
    console.log('Waiting for form to appear...');
    await page.waitForSelector('form', { state: 'visible', timeout: 30000 });

    // Fill in credentials
    console.log('Filling in credentials...');
    await page.locator('input[type="email"]').first().fill(TENANT_ADMIN.email);
    await page.locator('input[type="password"]').first().fill(TENANT_ADMIN.password);

    // Submit form
    console.log('Submitting login form...');
    await page.locator('button[type="submit"]').first().click();

    // Wait a bit for the response
    await page.waitForTimeout(2000);
    console.log(`After submit, current URL: ${page.url()}`);

    // Wait for redirect to dashboard
    try {
      await page.waitForURL('**/*dashboard*', { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      console.log(`✅ Login successful - redirected to: ${page.url()}`);
    } catch (error) {
      console.log(`⚠️ Redirect timeout. Current URL: ${page.url()}`);
      console.log(`Page content: ${await page.content()}`);
      throw error;
    }

    // Save authentication state
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const authFile = path.join(authDir, 'user.json');
    await page.context().storageState({ path: authFile });

    console.log(`✅ Authentication state saved to: ${authFile}\n`);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
