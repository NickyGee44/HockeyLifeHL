/**
 * Simple test script to verify Resend email configuration
 * Run with: node test-email.js
 */

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

async function testResendConfig() {
  console.log('🧪 Testing Resend Email Configuration...\n');

  // Check if API key is set
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ RESEND_API_KEY found:', apiKey.substring(0, 10) + '...');

  // Initialize Resend client
  const resend = new Resend(apiKey);

  // Test email parameters
  const testEmail = {
    from: 'HockeyLifeHL <noreply@hockeylifehl.com>',
    to: ['delivered@resend.dev'], // Resend's test email address
    subject: 'Test Email - HockeyLifeHL Configuration Check',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E31837;">HockeyLifeHL Email Test</h1>
        <p>This is a test email to verify your Resend configuration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p style="color: #003E7E;"><em>For Fun, For Beers, For Glory</em></p>
      </div>
    `
  };

  console.log('\n📧 Attempting to send test email...');
  console.log('   From:', testEmail.from);
  console.log('   To:', testEmail.to[0]);
  console.log('   Subject:', testEmail.subject);

  try {
    const { data, error } = await resend.emails.send(testEmail);

    if (error) {
      console.error('\n❌ Error sending email:', error);
      process.exit(1);
    }

    console.log('\n✅ Email sent successfully!');
    console.log('   Email ID:', data.id);
    console.log('\n📊 Configuration Status: WORKING ✅');
    console.log('\nNote: Check your Resend dashboard to see the email: https://resend.com/emails');

  } catch (err) {
    console.error('\n❌ Exception occurred:', err.message);
    console.error('\nPossible issues:');
    console.error('  - Invalid API key');
    console.error('  - Network connectivity problems');
    console.error('  - Resend service unavailable');
    process.exit(1);
  }
}

testResendConfig();
