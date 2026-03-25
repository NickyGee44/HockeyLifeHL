import type { League } from '../../types';
import { getLeagueTheme } from '../leagues';

function makeLeague(overrides: Partial<League> = {}): League {
  return {
    id: 'league-1',
    name: 'Metro League',
    short_name: 'ML',
    slug: 'metro-league',
    description: null,
    primary_color: null,
    secondary_color: null,
    accent_color: null,
    logo_url: null,
    banner_url: null,
    font_family: null,
    website_url: null,
    contact_email: null,
    contact_phone: null,
    address: null,
    city: null,
    state: null,
    zip_code: null,
    status: 'active',
    organization_id: 'org-1',
    created_at: '2026-01-01T00:00:00.000Z',
    settings: null,
    ...overrides,
  };
}

describe('@hockey-life/data league transformers', () => {
  it('builds theme defaults when league colors are missing', () => {
    const theme = getLeagueTheme(makeLeague());
    expect(theme.primaryColor).toBe('#D4AF37');
    expect(theme.secondaryColor).toBe('#1a1a1a');
    expect(theme.templateVariant).toBe('dark');
  });

  it('uses light preset font stack when theme preset is light', () => {
    const theme = getLeagueTheme(
      makeLeague({
        settings: { website: { themePreset: 'light' } },
        primary_color: '#112233',
        secondary_color: '#223344',
      })
    );

    expect(theme.templateVariant).toBe('light');
    expect(theme.primaryColor).toBe('#112233');
    expect(theme.fontFamily).toContain('Sora');
  });
});

