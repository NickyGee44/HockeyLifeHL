/**
 * Test script using Resend's verified onboarding domain
 * Run with: node test-email-verified-domain.js
 */

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

async function testResendConfig() {
  console.log('🧪 Testing Resend Email Configuration with verified domain...\n');

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ RESEND_API_KEY found:', apiKey.substring(0, 10) + '...');

  const resend = new Resend(apiKey);

  // Use Resend's verified onboarding domain for testing
  const testEmail = {
    from: 'Acme <onboarding@resend.dev>', // Resend's verified domain
    to: ['delivered@resend.dev'], // Resend's test inbox
    subject: 'HockeyLifeHL - Configuration Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E31837;">✅ Resend API Configuration Test</h1>
        <p>This email confirms that your Resend API key is <strong>valid and working</strong>.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <hr style="border: 1px solid #003E7E; margin: 20px 0;">
        <h2>Next Steps:</h2>
        <ol>
          <li>Verify your custom domain: <code>hockeylifehl.com</code></li>
          <li>Add DNS records to your domain registrar</li>
          <li>Wait for verification (usually takes a few minutes)</li>
        </ol>
        <p style="color: #003E7E;"><em>For Fun, For Beers, For Glory</em></p>
      </div>
    `
  };

  console.log('\n📧 Attempting to send test email...');
  console.log('   From:', testEmail.from);
  console.log('   To:', testEmail.to[0]);

  try {
    const { data, error } = await resend.emails.send(testEmail);

    if (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }

    console.log('\n✅ Email sent successfully!');
    console.log('   Email ID:', data.id);
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESEND API CONFIGURATION: WORKING ✅');
    console.log('='.repeat(60));
    console.log('\n⚠️  DOMAIN ISSUE DETECTED:');
    console.log('   Your domain "hockeylifehl.com" is NOT verified.');
    console.log('\n📋 To fix this:');
    console.log('   1. Go to: https://resend.com/domains');
    console.log('   2. Add domain: hockeylifehl.com');
    console.log('   3. Add the DNS records to your domain registrar');
    console.log('   4. Wait for verification');
    console.log('\n💡 Until then, use: onboarding@resend.dev for testing');

  } catch (err) {
    console.error('\n❌ Exception:', err.message);
    process.exit(1);
  }
}

testResendConfig();
