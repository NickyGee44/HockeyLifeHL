import { describe, expect, it } from '@jest/globals';
import {
  buildWebsiteEditorPreviewUrl,
  getWebsiteEditorPreviewOrigin,
} from '../preview';

describe('website editor preview helpers', () => {
  it('builds localhost preview URLs with path routing', () => {
    expect(buildWebsiteEditorPreviewUrl('http://localhost:3001', 'beer-league')).toBe(
      'http://localhost:3001/beer-league?preview=true'
    );
  });

  it('builds production preview URLs with league subdomains', () => {
    expect(buildWebsiteEditorPreviewUrl('https://beerleaguehockey.ca', 'beer-league')).toBe(
      'https://beer-league.beerleaguehockey.ca/?preview=true'
    );
  });

  it('derives the true origin from the final preview URL', () => {
    expect(
      getWebsiteEditorPreviewOrigin('https://beer-league.beerleaguehockey.ca/?preview=true')
    ).toBe('https://beer-league.beerleaguehockey.ca');
  });

  it('returns null for invalid preview URLs', () => {
    expect(getWebsiteEditorPreviewOrigin('not-a-url')).toBeNull();
  });
});
