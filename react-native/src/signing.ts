/**
 * Pure JavaScript HMAC-SHA256 implementation (zero native dependencies).
 * Works in React Native, Node.js, and browsers.
 */

const BLOCK_SIZE = 64;

const H = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number): number {
  return (x >>> n) | ((x << (32 - n)) >>> 0);
}

function sha256(message: Uint8Array): Uint8Array {
  const msgLen = message.length;
  const bitLen = msgLen * 8;

  const paddingLen = (((msgLen + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddingLen);
  padded.set(message);
  padded[msgLen] = 0x80;

  const dv = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  dv.setUint32(paddingLen - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(paddingLen - 4, bitLen >>> 0, false);

  const state = new Uint32Array(H);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddingLen; offset += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = dv.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resultDv = new DataView(result.buffer, result.byteOffset, result.byteLength);
  for (let i = 0; i < 8; i++) {
    resultDv.setUint32(i * 4, state[i], false);
  }
  return result;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let actualKey: Uint8Array;
  if (key.length > BLOCK_SIZE) {
    actualKey = sha256(key);
  } else {
    actualKey = key;
  }

  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(actualKey);

  const ipadInput = new Uint8Array(BLOCK_SIZE + message.length);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipadInput[i] = paddedKey[i] ^ 0x36;
  }
  ipadInput.set(message, BLOCK_SIZE);
  const innerHash = sha256(ipadInput);

  const opadInput = new Uint8Array(BLOCK_SIZE + 32);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    opadInput[i] = paddedKey[i] ^ 0x5c;
  }
  opadInput.set(innerHash, BLOCK_SIZE);
  return sha256(opadInput);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    chars.push(String.fromCharCode(bytes[i]));
  }
  const binary = chars.join('');

  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += base64chars[b1 >> 2];
    result += base64chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? base64chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? base64chars[b3 & 63] : '=';
  }
  return result;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function sign(secret: string, message: string): string {
  const encoder = new TextEncoder();
  const sigBytes = hmacSha256(encoder.encode(secret), encoder.encode(message));
  return bytesToBase64(sigBytes);
}

export function verify(secret: string, message: string, signature: string): boolean {
  const expected = sign(secret, message);
  if (expected.length !== signature.length) return false;
  return constantTimeEqual(expected, signature);
}

export function buildSigningMessage(
  method: string,
  path: string,
  timestamp: string,
  body: string
): string {
  return `${method}:${path}:${timestamp}:${body}`;
}
