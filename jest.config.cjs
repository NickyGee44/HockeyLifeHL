/**
 * Root Jest config that runs all workspace test projects.
 */

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/apps/league-builder/jest.config.cjs',
    '<rootDir>/apps/league-sites/jest.config.cjs',
    '<rootDir>/packages/data/jest.config.cjs',
    '<rootDir>/packages/database/jest.config.cjs',
    '<rootDir>/packages/auth/jest.config.cjs',
  ],
};

