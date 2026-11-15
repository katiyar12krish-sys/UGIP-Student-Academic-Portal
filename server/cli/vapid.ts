// Makes the key pair that identifies THIS server to the browsers' push services (VAPID, RFC 8292). Run once:
//   npm run vapid
// then paste the three lines into .env. Keep the private key secret; if you change the keys, every phone has to allow notifications again.
import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
const priv = privateKey.export({ format: 'jwk' }) as { d: string };
const publicRaw = Buffer.concat([Buffer.from([0x04]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]).toString('base64url');

console.log('Add these to .env:\n');
console.log(`VAPID_PUBLIC_KEY="${publicRaw}"`);
console.log(`VAPID_PRIVATE_KEY="${priv.d}"`);
console.log('VAPID_SUBJECT="mailto:principal@your-college-domain"   # a real contact address for the push services');
