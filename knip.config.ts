import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['turbo.json'],
      ignoreDependencies: [
        'tw-animate-css',
        '@tailwindcss/postcss',
        'tailwindcss',
        'eslint-config-next',
      ],
    },
    'apps/league-builder': {
      entry: ['src/app/**/page.tsx', 'src/app/**/layout.tsx', 'src/app/**/route.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: ['@ducanh2912/next-pwa'],
    },
    'apps/league-sites': {
      entry: ['src/app/**/page.tsx', 'src/app/**/layout.tsx', 'src/app/**/route.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'apps/player-companion': {
      entry: ['src/app/**/page.tsx', 'src/app/**/layout.tsx'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'apps/mobile': {
      entry: ['app/**/*.tsx', 'app/**/*.ts'],
      project: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    },
    'packages/ui': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/database': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/auth': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/data': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/ui-native': {
      entry: ['src/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
    },
  },
  ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  ignoreExportsUsedInFile: true,
};

export default config;
