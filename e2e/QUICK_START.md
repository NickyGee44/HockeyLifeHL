# E2E Tests - Quick Start Guide

## First Time Setup (5 minutes)

```bash
# 1. Navigate to e2e directory
cd e2e

# 2. Install dependencies
pnpm install

# 3. Install all browsers (Chromium, Firefox, Webkit)
pnpm run install-browsers

# 4. Verify browsers work
pnpm verify-browsers

# 5. Create .env file (copy from .env.example if exists)
# Or create manually with your Supabase credentials
```

## Daily Usage

### Run All Tests
```bash
cd e2e
pnpm test
```

### Run Specific Browser
```bash
pnpm test:chromium    # Chrome/Edge
pnpm test:firefox     # Firefox
pnpm test:webkit      # Safari
pnpm test:mobile      # Mobile Chrome
```

### Run Specific Test File
```bash
pnpm test:auth        # Authentication tests
pnpm test:leagues     # League management tests
pnpm test:payments    # Payment flow tests
```

### Debug Tests
```bash
pnpm test:headed      # Watch browser execute tests
pnpm test:debug       # Playwright Inspector (step through)
pnpm test:ui          # Playwright UI Mode (best for debugging)
```

### View Test Report
```bash
pnpm run report       # Opens HTML report in browser
```

## Troubleshooting

### Tests Failing Immediately (<100ms)?
```bash
# Reinstall browsers
pnpm run install-browsers

# Verify they work
pnpm verify-browsers
```

### Browser Not Found?
```bash
# Install specific browser
pnpm playwright install firefox --with-deps
pnpm playwright install webkit --with-deps
pnpm playwright install chromium --with-deps
```

### Dev Server Not Running?
```bash
# In separate terminal, start dev server
cd ..
pnpm --filter league-builder dev
```

### Authentication Issues?
```bash
# Check .env file has correct credentials
cat .env

# Re-run auth setup
pnpm playwright test --project=setup
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests, all browsers |
| `pnpm test:chromium` | Chrome/Edge only |
| `pnpm test:firefox` | Firefox only |
| `pnpm test:webkit` | Safari only |
| `pnpm test:headed` | Watch tests run |
| `pnpm test:debug` | Step through tests |
| `pnpm test:ui` | Interactive UI mode |
| `pnpm verify-browsers` | Check browsers installed |
| `pnpm run install-browsers` | Install all browsers |
| `pnpm run report` | View test report |

## File Structure

```
e2e/
├── tests/              # Your test files
│   ├── auth.spec.ts
│   ├── leagues.spec.ts
│   └── payments.spec.ts
├── pages/              # Page objects
├── fixtures/           # Test data
├── utils/              # Helper functions
├── .env               # Environment config (create this)
└── playwright.config.ts
```

## Environment Variables (.env)

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=password
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Tips

1. **Always verify browsers first** - Run `pnpm verify-browsers` after setup
2. **Use headed mode for debugging** - `pnpm test:headed` to watch tests
3. **Check test artifacts** - Screenshots/videos saved in `test-results/`
4. **Use UI mode for development** - `pnpm test:ui` is the best DX
5. **Run setup when auth fails** - `pnpm playwright test --project=setup`

## Help

- Full documentation: `README.md`
- Browser fix details: `BROWSER_FIX_SUMMARY.md`
- Verification report: `VERIFICATION_REPORT.md`
- Playwright docs: https://playwright.dev/

## Status Check

```bash
# Quick health check
cd e2e
pnpm verify-browsers && echo "✅ All systems ready!"
```

Expected output:
```
🚀 Verifying Playwright Browser Installations
══════════════════════════════════════════════════
✅ Chromium is working correctly
✅ Firefox is working correctly
✅ Webkit is working correctly
✨ All browsers verified successfully!
✅ All systems ready!
```
