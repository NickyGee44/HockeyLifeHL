# Test Fix Summary - League Wizard Selector Issue

## Problem
All League Wizard tests failing with same error:
```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
waiting for locator('button[role="combobox"]').filter({ hasText: /Select country|Country/ }).first() to be visible
```

## Root Cause Analysis

### Current Selector (Line 72)
```typescript
this.countrySelect = page.locator('[class*="space-y"] label:has-text("Country")').locator('..').locator('button[role="combobox"]');
```

### Component Structure (FormField)
```tsx
<div class="space-y-2">
  <Label htmlFor="country">Country *</Label>
  <div class="relative">
    <Select>
      <SelectTrigger id="country">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
    </Select>
  </div>
</div>
```

### Why the Selector Fails
1. The selector chain is complex and fragile
2. Using `.locator('..')` to go up parent is unreliable
3. The Label component might have additional elements (like the required asterisk `*`)

## Solution: Simplify Selectors

Instead of complex parent navigation, use direct attribute targeting:

**Option 1: Use ID (Best)**
```typescript
this.countrySelect = page.locator('button#country');
```

**Option 2: Use Placeholder (Reliable)**
```typescript
this.countrySelect = page.getByRole('combobox', { name: /country/i });
// or
this.countrySelect = page.locator('button[role="combobox"]').filter({ has: page.locator('text=Select country') });
```

**Option 3: Use aria-labelledby**
```typescript
this.countrySelect = page.locator('button[role="combobox"][aria-labelledby*="country"]');
```

## Recommended Fix

The simplest and most reliable approach is to use the `id` attribute that FormField sets on the child component:

```typescript
// Line 72-73 in LeagueWizardPage.ts
this.countrySelect = page.locator('button#country');
this.timezoneSelect = page.locator('button#timezone');
```

This works because:
1. FormField passes `id: htmlFor` to the child (line 31 in form-field.tsx)
2. SelectTrigger renders as `<button>` with role="combobox"
3. The `id` is unique and directly identifies the element

## Test After Fix
```bash
cd e2e
pnpm test -- tests/leagues.spec.ts:57 --project=chromium
```

Expected: Test passes, selector finds the button immediately.
