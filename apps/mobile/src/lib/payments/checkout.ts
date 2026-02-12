import * as WebBrowser from 'expo-web-browser';

const CHECKOUT_BASE_URL = 'https://pay.beerleaguehockey.ca';

interface CheckoutParams {
  leagueId: string;
  seasonId: string;
  playerId: string;
  teamId?: string;
  amount?: number;
  returnUrl?: string;
}

/**
 * Open Stripe Checkout in an in-app browser.
 * Hockey league payments are physical services — exempt from IAP rules.
 * Uses the custom payment domain (pay.beerleaguehockey.ca).
 */
export async function openCheckout(params: CheckoutParams) {
  const searchParams = new URLSearchParams({
    league_id: params.leagueId,
    season_id: params.seasonId,
    player_id: params.playerId,
    ...(params.teamId && { team_id: params.teamId }),
    ...(params.amount && { amount: String(params.amount) }),
    redirect_url: params.returnUrl ?? 'hockeylifehl://payments/complete',
  });

  const url = `${CHECKOUT_BASE_URL}/checkout?${searchParams.toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(url, 'hockeylifehl://payments/complete');

  return {
    success: result.type === 'success',
    url: result.type === 'success' ? result.url : null,
  };
}

/**
 * Open payment history page in browser
 */
export async function openPaymentHistory(leagueSlug: string) {
  await WebBrowser.openBrowserAsync(`https://${leagueSlug}.beerleaguehockey.ca/payments`);
}
