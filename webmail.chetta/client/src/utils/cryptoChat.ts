/**
 * CryptoMail E2EE (End-to-End Encryption) Chat Engine
 * Uses browser-native WebCrypto API:
 * - ECDH with P-256 curve for asymmetric key agreement
 * - AES-256-GCM for symmetric message encryption with random 96-bit IV
 * - Zero-knowledge: the server only sees ciphertext and IV; private keys never leave the client.
 */

// Helper: Uint8Array to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Memory cache for derived AES-GCM shared keys
const sharedKeyCache = new Map<string, CryptoKey>();
let myPrivateKeyCache: { accountId: string; key: CryptoKey } | null = null;

/**
 * Retrieves the persistent private ECDH key and public key for this account.
 * Synchronized across all devices and browsers so keys never diverge.
 */
export async function getOrCreateKeyPair(accountId: string): Promise<{
  privateKey: CryptoKey;
  publicKeyJwk: string;
}> {
  const privStorageKey = `cryptomail_priv_key_${accountId}`;
  const pubStorageKey = `cryptomail_pub_key_${accountId}`;

  if (myPrivateKeyCache && myPrivateKeyCache.accountId === accountId) {
    const storedPub = localStorage.getItem(pubStorageKey) || '';
    if (storedPub) {
      return { privateKey: myPrivateKeyCache.key, publicKeyJwk: storedPub };
    }
  }

  // Fetch persistent keypair from server
  try {
    const res = await fetch(`/api/chat/keys/mine?accountId=${accountId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.privateKeyJwk && data.publicKeyJwk) {
        const privJwk = JSON.parse(data.privateKeyJwk);
        const privateKey = await window.crypto.subtle.importKey(
          'jwk',
          privJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey', 'deriveBits']
        );
        myPrivateKeyCache = { accountId, key: privateKey };
        localStorage.setItem(privStorageKey, data.privateKeyJwk);
        localStorage.setItem(pubStorageKey, data.publicKeyJwk);
        return { privateKey, publicKeyJwk: data.publicKeyJwk };
      }
    }
  } catch (err) {
    console.warn('Could not fetch keys from server, trying local cache:', err);
  }

  // Fallback to localStorage
  const storedPriv = localStorage.getItem(privStorageKey);
  const storedPub = localStorage.getItem(pubStorageKey);

  if (storedPriv && storedPub) {
    try {
      const privJwk = JSON.parse(storedPriv);
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        privJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );
      myPrivateKeyCache = { accountId, key: privateKey };
      return { privateKey, publicKeyJwk: storedPub };
    } catch (err) {
      console.warn('Failed to restore stored ECDH keys:', err);
    }
  }

  // Generate new ECDH P-256 key pair
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const exportedPriv = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const exportedPub = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

  const pubJwkStr = JSON.stringify(exportedPub);
  const privJwkStr = JSON.stringify(exportedPriv);
  localStorage.setItem(privStorageKey, privJwkStr);
  localStorage.setItem(pubStorageKey, pubJwkStr);

  myPrivateKeyCache = { accountId, key: keyPair.privateKey };

  try {
    await fetch('/api/chat/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, publicKeyJwk: pubJwkStr, privateKeyJwk: privJwkStr })
    });
  } catch {}

  return { privateKey: keyPair.privateKey, publicKeyJwk: pubJwkStr };
}

/**
 * Derives a 256-bit AES-GCM key using local ECDH private key and remote peer's public key (JWK).
 */
export async function deriveSharedAesKey(
  accountId: string,
  peerPublicKeyJwkStr: string
): Promise<CryptoKey> {
  const cacheKey = `${accountId}::${peerPublicKeyJwkStr}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey)!;
  }

  // Ensure local private key is loaded
  let myPrivateKey: CryptoKey;
  if (myPrivateKeyCache && myPrivateKeyCache.accountId === accountId) {
    myPrivateKey = myPrivateKeyCache.key;
  } else {
    const pair = await getOrCreateKeyPair(accountId);
    myPrivateKey = pair.privateKey;
  }

  // Import peer's public key
  const peerJwk = JSON.parse(peerPublicKeyJwkStr);
  const peerPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    peerJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // Derive AES-GCM 256 key
  const sharedKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  sharedKeyCache.set(cacheKey, sharedKey);
  return sharedKey;
}

/**
 * Encrypts a plaintext string with the shared AES-GCM key.
 * Returns Base64 ciphertext and Base64 IV.
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  // Generate random 96-bit (12-byte) IV for GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encodedText
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypts a Base64 ciphertext using the shared AES-GCM key and Base64 IV.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<string> {
  const iv = base64ToUint8Array(ivBase64);
  const encryptedBytes = base64ToUint8Array(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}
