#!/usr/bin/env node
/**
 * Browser Verification Script
 * Tests if all Playwright browsers can launch properly
 */

import { chromium, firefox, webkit } from '@playwright/test';

async function verifyBrowser(name: string, launcher: typeof chromium) {
  try {
    console.log(`\n🔍 Testing ${name}...`);
    const browser = await launcher.launch({
      headless: true,
      timeout: 15000,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to a simple page to verify browser works
    await page.goto('data:text/html,<h1>Browser Test</h1>');
    const title = await page.textContent('h1');

    if (title === 'Browser Test') {
      console.log(`✅ ${name} is working correctly`);
    } else {
      throw new Error('Page content verification failed');
    }

    await browser.close();
    return true;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error instanceof Error ? error.message : error);
    console.log(`\n💡 Try running: pnpm playwright install ${name.toLowerCase()} --with-deps\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Verifying Playwright Browser Installations\n');
  console.log('═'.repeat(50));

  const results = await Promise.all([
    verifyBrowser('Chromium', chromium),
    verifyBrowser('Firefox', firefox),
    verifyBrowser('Webkit', webkit),
  ]);

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 Verification Summary:');
  console.log(`  Chromium: ${results[0] ? '✅ Pass' : '❌ Fail'}`);
  console.log(`  Firefox:  ${results[1] ? '✅ Pass' : '❌ Fail'}`);
  console.log(`  Webkit:   ${results[2] ? '✅ Pass' : '❌ Fail'}`);

  const allPassed = results.every(r => r);

  if (allPassed) {
    console.log('\n✨ All browsers verified successfully!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some browsers failed verification. Please install missing browsers.\n');
    console.log('Run: pnpm run install-browsers\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
