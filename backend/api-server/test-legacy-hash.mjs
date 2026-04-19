import crypto from 'crypto';
import { readFileSync } from 'fs';

/**
 * Test script to figure out the legacy password hashing method
 * 
 * Usage: node test-legacy-hash.mjs
 * 
 * Then update: password, hash, salt values below
 */

// TODO: Update these with actual values
const plainPassword = "@123456";  // What password was used
const storedHash = "a1c8e4801eeefe8e7fafc9f65818a4e7f104fa3246a88da8037a817b95ab1cf89faabff2bd22d47fb803a4ce6a2e69cd5f9fb5a45fb7cd537826aa0e87ee1131"; // From hash.salt
const storedSalt = "2c50b8f07d9e5e2165ba7fde2ffc7a0d";

console.log("🔍 Testing legacy password hashing methods...\n");
console.log(`Stored Hash: ${storedHash}`);
console.log(`Stored Salt: ${storedSalt}\n`);

// Test various combinations
const tests = [
  {
    name: "SHA512(password + salt)",
    compute: () => crypto.createHash('sha512').update(plainPassword + storedSalt).digest('hex')
  },
  {
    name: "SHA512(salt + password)",
    compute: () => crypto.createHash('sha512').update(storedSalt + plainPassword).digest('hex')
  },
  {
    name: "SHA512(password + saltHex)",
    compute: () => crypto.createHash('sha512').update(plainPassword + Buffer.from(storedSalt, 'hex')).digest('hex')
  },
  {
    name: "SHA512(saltHex + password)",
    compute: () => crypto.createHash('sha512').update(Buffer.from(storedSalt, 'hex') + plainPassword).digest('hex')
  },
  {
    name: "SHA256(password + salt)",
    compute: () => crypto.createHash('sha256').update(plainPassword + storedSalt).digest('hex')
  },
  {
    name: "SHA1(password + salt)",
    compute: () => crypto.createHash('sha1').update(plainPassword + storedSalt).digest('hex')
  },
  {
    name: "MD5(password + salt)",
    compute: () => crypto.createHash('md5').update(plainPassword + storedSalt).digest('hex')
  },
tests.push(
  {
    name: "PBKDF2-SHA512 (100 iterations, password + salt)",
    compute: () => crypto.pbkdf2Sync(plainPassword, storedSalt, 100, 64, 'sha512').toString('hex')
  },
  {
    name: "PBKDF2-SHA512 (1000 iterations, password + salt)",
    compute: () => crypto.pbkdf2Sync(plainPassword, storedSalt, 1000, 64, 'sha512').toString('hex')
  },
  {
    name: "PBKDF2-SHA512 (10000 iterations, password + salt)",
    compute: () => crypto.pbkdf2Sync(plainPassword, storedSalt, 10000, 64, 'sha512').toString('hex')
  },
  {
    name: "PBKDF2-SHA256 (1000 iterations, password + salt)",
    compute: () => crypto.pbkdf2Sync(plainPassword, storedSalt, 1000, 32, 'sha256').toString('hex')
  },
  {
    name: "PBKDF2-SHA256 (10000 iterations, password + salt)",
    compute: () => crypto.pbkdf2Sync(plainPassword, storedSalt, 10000, 32, 'sha256').toString('hex')
  },
);

let foundMatch = false;

for (const test of tests) {
  try {
    const computed = test.compute();
    const isMatch = computed === storedHash;
    
    console.log(`${isMatch ? '✅' : '❌'} ${test.name}`);
    if (isMatch) {
      console.log(`   ^^^ THIS IS THE CORRECT METHOD ^^^`);
      foundMatch = true;
    }
    console.log(`   Result: ${computed.substring(0, 32)}...`);
    console.log();
  } catch (err) {
    console.log(`❌ ${test.name} - Error: ${err.message}\n`);
  }
}

if (!foundMatch) {
  console.log("❌ No matching algorithm found!");
  console.log("\n📝 Next steps:");
  console.log("1. Verify the plainPassword is correct");
  console.log("2. Check if the hash/salt pair in database is correct");
  console.log("3. The old system might be using a different hashing library");
  console.log("4. Try checking if it's PBKDF2 or another iterative hash");
}
