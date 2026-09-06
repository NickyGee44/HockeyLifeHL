import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, '../..');

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

const AUTO_ADVANCE_COMPONENTS = [
  {
    file: 'src/components/PremiumScoreTicker.tsx',
    manualControls: [/aria-label="Scroll left"/, /aria-label="Scroll right"/, /onClick=\{\(\) => nudgeTrack\(-1\)\}/],
  },
  {
    file: 'src/components/home/HomepageStoryHero.tsx',
    manualControls: [/aria-label="Previous story"/, /aria-label="Next story"/, /onClick=\{\(\) => jumpToSlide/],
  },
  {
    file: 'src/components/gallery/PhotoReelCarousel.tsx',
    manualControls: [/aria-label="Previous photo"/, /aria-label="Next photo"/, /onClick=\{\(\) => advance/],
  },
  {
    file: 'src/components/team/PointInsightsCarousel.tsx',
    manualControls: [/aria-label="Previous insight"/, /aria-label="Next insight"/, /onClick=\{prev\}/],
  },
  {
    file: 'src/components/team/RivalsCarousel.tsx',
    manualControls: [/aria-label="Previous rival"/, /aria-label="Next rival"/, /onClick=\{prev\}/],
  },
  {
    file: 'src/components/team/RivalsTaleOfTheTape.tsx',
    manualControls: [/aria-label="Previous rival"/, /aria-label="Next rival"/, /onClick=\{prev\}/],
  },
];

test('league layout mounts the approved footer with league visibility data', async () => {
  const layout = await read('src/app/[leagueSlug]/layout.tsx');

  assert.match(layout, /import\s+\{\s*LeagueFooter\s*\}\s+from\s+['"]@\/components\/LeagueFooter['"]/, 'LeagueFooter is not imported');
  assert.match(layout, /<LeagueFooter[\s\S]*?league=\{league\}[\s\S]*?leagueSlug=\{leagueSlug\}[\s\S]*?visiblePages=/, 'LeagueFooter is not rendered with league, slug, and visible-page data');
});

test('all JS auto-advance paths stop for reduced motion while manual controls remain', async () => {
  const reducedMotionHook = await read('src/hooks/usePrefersReducedMotion.ts');
  assert.match(reducedMotionHook, /['"]\(prefers-reduced-motion: reduce\)['"]/, 'Reduced-motion media query is not declared');
  assert.match(reducedMotionHook, /matchMedia\(REDUCED_MOTION_QUERY\)/, 'Reduced-motion preference is not read from matchMedia');
  assert.match(reducedMotionHook, /addEventListener\(['"]change['"]/, 'Reduced-motion preference does not respond to changes');

  for (const { file, manualControls } of AUTO_ADVANCE_COMPONENTS) {
    const source = await read(file);
    assert.match(source, /usePrefersReducedMotion/, `${file} does not consume the reduced-motion preference`);
    assert.match(source, /prefersReducedMotion/, `${file} does not guard its automatic motion`);
    for (const contract of manualControls) {
      assert.match(source, contract, `${file} lost a manual navigation control`);
    }
  }
});

test('reduced-transparency mode makes shared and utility blur surfaces opaque and readable', async () => {
  const styles = await read('src/app/globals.css');
  const start = styles.indexOf('@media (prefers-reduced-transparency: reduce)');
  const end = styles.indexOf('/* =============================================================================\n   PRINT STYLES', start);
  const fallback = styles.slice(start, end);

  assert.ok(start >= 0 && end > start, 'Reduced-transparency fallback block is missing');
  for (const surface of ['.glass-card', '.glass-card-strong', '.glass-chrome', '.glass-control', '.game-card', '.stat-card']) {
    assert.match(fallback, new RegExp(surface.replace('.', '\\.')), `Reduced-transparency fallback omits ${surface}`);
  }
  assert.match(fallback, /\[class\*=['"]backdrop-blur['"]\]/, 'Tailwind backdrop-blur utility surfaces are not covered');
  assert.match(fallback, /backdrop-filter:\s*none\s*!important/, 'Blur is not disabled in reduced-transparency mode');
  assert.match(fallback, /background(?:-color)?:\s*var\(--blh-glass-fallback\)\s*!important/, 'Fallback does not provide a readable opaque surface');
});

test('hover-revealed affordances also reveal from keyboard focus', async () => {
  const files = [
    'src/components/LeagueFooter.tsx',
    'src/components/PremiumScoreTicker.tsx',
    'src/components/gallery/PhotoLightbox.tsx',
    'src/components/gallery/PhotoReelCarousel.tsx',
  ];

  for (const file of files) {
    const source = await read(file);
    const hoverReveals = source.match(/group-hover:(?:opacity-\d+|scale-\d+|w-(?:full|\d+)|bg-[^\s'"`]+)/g) ?? [];
    assert.ok(hoverReveals.length > 0, `${file} no longer contains the targeted hover affordance`);
    assert.match(source, /group-focus-(?:visible|within):(?:opacity-\d+|scale-\d+|w-(?:full|\d+)|bg-)/, `${file} has a hover-only revealed affordance`);
  }

  const captainDuties = await read('src/app/[leagueSlug]/captain/duties/page.tsx');
  assert.match(captainDuties, /group-hover:block[^"']*group-focus-within:block/, 'Captain duties hover menu does not open for keyboard focus');

  const teamsGrid = await read('src/app/[leagueSlug]/teams/TeamsGrid.tsx');
  assert.match(teamsGrid, /lg:group-hover:opacity-100[^"']*lg:group-focus-visible:opacity-100/, 'Team card affordance does not reveal for keyboard focus');
});

test('targeted icon-only controls expose at least 44px hit areas', async () => {
  const files = [
    'src/components/FloatingDock.tsx',
    'src/components/LeagueHeader.tsx',
    'src/components/PremiumScoreTicker.tsx',
    'src/components/gallery/PhotoLightbox.tsx',
    'src/components/gallery/PhotoReelCarousel.tsx',
    'src/components/history/ChampionsTimeline.tsx',
    'src/components/scorekeeper/PenaltyEntry.tsx',
    'src/components/scorekeeper/PlayerPicker.tsx',
    'src/components/scorekeeper/ScoreSheetUpload.tsx',
    'src/components/scorekeeper/ScoringInterface.tsx',
    'src/components/team/PointInsightsCarousel.tsx',
    'src/components/team/RivalsCarousel.tsx',
    'src/components/team/RivalsTaleOfTheTape.tsx',
  ];

  for (const file of files) {
    const source = await read(file);
    const labelledButtons = [...source.matchAll(/<button\b[\s\S]*?<\/button>/g)]
      .filter(([button]) => /aria-label=/.test(button));
    assert.ok(labelledButtons.length > 0, `${file} has no targeted icon controls`);
    for (const [button] of labelledButtons) {
      assert.match(button, /(?:h-11|min-h-11)/, `${file} has an icon button shorter than 44px`);
      assert.match(button, /(?:w-11|min-w-11)/, `${file} has an icon button narrower than 44px`);
    }
  }
});

test('FloatingDock primary navigation exposes 44px touch targets', async () => {
  const dock = await read('src/components/FloatingDock.tsx');

  for (const label of ['Standings', 'Schedule', 'Stats', 'More']) {
    const controlPattern = new RegExp(
      `<(?:Link|button)\\b[\\s\\S]*?className=\\{?\`?[\\s\\S]*?min-h-11[\\s\\S]*?>[\\s\\S]*?<span className="text-\\[10px\\] font-semibold">${label}<\\/span>`,
    );
    assert.match(dock, controlPattern, `${label} dock action is shorter than 44px`);
  }
});

test('FloatingDock mobile menu is viewport bounded, scrollable, and safe-area aware', async () => {
  const dock = await read('src/components/FloatingDock.tsx');

  assert.match(dock, /max-h-\[calc\(100dvh[_-]+env\(safe-area-inset-bottom/, 'Mobile menu lacks a safe-area-aware viewport max height');
  assert.match(dock, /overflow-y-auto/, 'Mobile menu cannot scroll when its content exceeds the viewport');
  assert.match(dock, /bottom:\s*moreMenuBottomOffset/, 'Mobile menu does not use its safe-area-aware bottom offset');
});

test('league home explicitly keeps the HomepageStoryHero info card enabled', async () => {
  const home = await read('src/app/[leagueSlug]/page.tsx');
  assert.match(home, /<HomepageStoryHero[\s\S]*?showInfoCard=\{true\}[\s\S]*?\/>/, 'HomepageStoryHero showInfoCard design decision is not explicit');
});

test('dead rebuild placeholder implementation is removed', async () => {
  await assert.rejects(
    stat(path.join(ROOT, 'src/components/rebuild/RebuildRoute.tsx')),
    (error) => error?.code === 'ENOENT',
    'Unused RebuildRoute implementation still exists',
  );
});

test('REBUILD guide describes the implemented review state, not placeholder shells', async () => {
  const guide = await read('REBUILD.md');
  assert.doesNotMatch(guide, /rebuild shell|placeholder shell|not-started|pick a route ID/i, 'REBUILD.md still documents the placeholder workflow');
  assert.match(guide, /implemented/i, 'REBUILD.md does not describe the implemented rebuild');
  assert.match(guide, /review/i, 'REBUILD.md does not describe the current review workflow');
});
