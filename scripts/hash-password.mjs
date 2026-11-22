// Prints the ADMIN_PASSWORD_HASH value for a password (same scrypt settings as the server).
// Usage: node scripts/hash-password.mjs 'your password'
import { randomBytes, scryptSync } from 'node:crypto';

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Give a password of at least 8 characters.');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(`scrypt$${salt.toString('base64')}$${hash.toString('base64')}`);
