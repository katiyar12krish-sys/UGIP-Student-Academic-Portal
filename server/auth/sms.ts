/**
 * SMS sending. In India a transactional SMS needs (1) a DLT-registered Entity (Principal Entity ID),
 * (2) a registered Sender ID/header, (3) a registered + approved content template per message type, and (4) an SMS provider
 * (MSG91, Twilio, Gupshup, NIC SMS gateway, ...). That registration takes days to weeks, so SMS is OFF until configured.
 *
 *   SMS_PROVIDER=none      (default) SMS features are switched off; the app falls back to "ask admin / faculty"
 *   SMS_PROVIDER=console   development only: prints the message in the server log instead of sending it
 *   SMS_PROVIDER=<other>   add an adapter below (one function) once DLT + provider are ready
 *
 * Env needed later (names are suggestions): DLT_ENTITY_ID, DLT_SENDER_ID, DLT_TEMPLATE_ID_OTP, provider API key.
 * The OTP template text must match the DLT-approved template exactly, e.g. "{#var#} is your OTP for UGIP portal. Valid 5 minutes."
 */
export interface SmsProvider { name: string; sendOtp(phone: string, code: string): Promise<void> }

const consoleProvider: SmsProvider = {
  name: 'console',
  async sendOtp(phone, code) {
    if (process.env.NODE_ENV === 'production') throw new Error('console SMS provider must not be used in production');
    console.log(`[sms:console] OTP for ${phone}: ${code}`);
  },
};

// Sms provider.
export function smsProvider(): SmsProvider | null {
  switch ((process.env.SMS_PROVIDER || 'none').toLowerCase()) {
    case 'console': return consoleProvider;
    // case 'msg91': return msg91Provider;   // <- add the adapter here after DLT approval
    default: return null;
  }
}
// Sms enabled.
export const smsEnabled = () => smsProvider() !== null;

/** Indian mobile numbers only: 10 digits starting 6-9, optional +91 / 0 prefix. Returns the 10 digits or null. */
export function normalizeIndianMobile(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/[\s-]/g, '');
  // strip a country / trunk prefix only when the rest is still a full 10-digit number (a real mobile can itself start with 91)
  if (/^\+91\d{10}$/.test(d)) d = d.slice(3);
  else if (/^91\d{10}$/.test(d)) d = d.slice(2);
  else if (/^0\d{10}$/.test(d)) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
// Mask phone.
export const maskPhone = (p: string) => `${'*'.repeat(6)}${p.slice(-4)}`;
