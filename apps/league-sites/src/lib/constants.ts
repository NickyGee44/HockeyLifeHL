import type { LeagueSponsor } from '@/lib/types';

export const DEFAULT_BLH_SPONSOR: LeagueSponsor = {
  id: 'blh-default',
  name: 'Beer League Hockey',
  logo_url: '/sponsors/beer-league-hockey.png',
  website_url: 'https://beerleaguehockey.ca',
  tier: 'gold',
  description: 'Powered by Beer League Hockey',
  display_order: 999,
  is_active: true,
  league_id: '',
};
