/**
 * Archive subscription products - not using subscriptions
 * Business model: 2.99% payment processing fee only
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

async function main() {
  console.log('Archiving subscription products...');
  console.log('(Business model: 2.99% fee only, no subscriptions)');
  console.log('');

  const products = await stripe.products.list({ limit: 50 });

  let archived = 0;
  for (const product of products.data) {
    if (
      product.active &&
      product.name.includes('HockeyLife') &&
      (product.name.includes('Starter') ||
        product.name.includes('Pro') ||
        product.name.includes('Business') ||
        product.name.includes('Enterprise'))
    ) {
      console.log(`  Archiving: ${product.name} (${product.id})`);
      await stripe.products.update(product.id, { active: false });
      archived++;
    }
  }

  console.log('');
  console.log(`Archived ${archived} subscription products.`);
  console.log('');
  console.log('Remaining active products are for registration fees.');
}

main().catch(console.error);
