const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { sign, verify, buildSigningMessage } = require('../../dist/signing.js');

describe('sign()', () => {
  it('produces non-empty base64 string', () => {
    const sig = sign('sk_test', 'hello');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 0);
    assert.doesNotThrow(() => Buffer.from(sig, 'base64'));
  });

  it('is deterministic', () => {
    assert.equal(sign('key', 'message'), sign('key', 'message'));
  });

  it('produces different output for different messages', () => {
    assert.notEqual(sign('key', 'message one'), sign('key', 'message two'));
  });

  it('produces different output for different keys', () => {
    assert.notEqual(sign('key1', 'test'), sign('key2', 'test'));
  });

  it('works with empty string message', () => {
    const sig = sign('sk_test', '');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 0);
  });

  it('works with empty string key', () => {
    const sig = sign('', 'message');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 0);
  });

  it('matches Node.js crypto for various inputs', () => {
    const cases = [
      ['key123', 'hello world'],
      ['', 'non-empty message'],
      ['a long key that should be long enough to test padding', 'short message'],
      ['short-key', 'a longer message to test various sizes. '.repeat(10)],
    ];
    for (const [key, msg] of cases) {
      const sig = sign(key, msg);
      const expected = crypto.createHmac('sha256', key).update(msg).digest('base64');
      assert.equal(sig, expected, `mismatch for key="${key.substring(0, 20)}..." msg="${msg.substring(0, 20)}..."`);
    }
  });

  it('matches Node.js crypto HMAC-SHA256 output', () => {
    const sig = sign('sk_test', 'test');
    const expected = crypto.createHmac('sha256', 'sk_test').update('test').digest('base64');
    assert.equal(sig, expected);
  });

  it('matches Node.js crypto for various inputs', () => {
    const cases = [
      ['key123', 'hello world'],
      ['', 'non-empty message'],
      ['a long key that should be long enough to test padding', 'short message'],
      ['short-key', 'a longer message to test various sizes. '.repeat(10)],
    ];
    for (const [key, msg] of cases) {
      const sig = sign(key, msg);
      const expected = crypto.createHmac('sha256', key).update(msg).digest('base64');
      assert.equal(sig, expected, `mismatch for key="${key.substring(0, 20)}..." msg="${msg.substring(0, 20)}..."`);
    }
  });
});

describe('verify()', () => {
  it('returns true for valid signature', () => {
    const sig = sign('sk_test', 'payload');
    assert.equal(verify('sk_test', 'payload', sig), true);
  });

  it('returns false for tampered payload', () => {
    const sig = sign('sk_test', 'original');
    assert.equal(verify('sk_test', 'tampered', sig), false);
  });

  it('returns false for random string', () => {
    assert.equal(verify('sk_test', 'payload', 'aaaaaaaa'), false);
  });

  it('returns false for empty signature', () => {
    assert.equal(verify('sk_test', 'payload', ''), false);
  });

  it('returns true for empty key when signature matches', () => {
    const sig = sign('', 'payload');
    assert.equal(verify('', 'payload', sig), true);
  });
});

describe('buildSigningMessage()', () => {
  it('builds correct message format', () => {
    const msg = buildSigningMessage('POST', '/v1/api/accounts', '1234567890', '{"key":"val"}');
    assert.equal(msg, 'POST:/v1/api/accounts:1234567890:{"key":"val"}');
  });

  it('works with empty body', () => {
    const msg = buildSigningMessage('GET', '/health', '0', '');
    assert.equal(msg, 'GET:/health:0:');
  });

  it('works with empty path', () => {
    const msg = buildSigningMessage('GET', '', '123', '');
    assert.equal(msg, 'GET::123:');
  });
});
