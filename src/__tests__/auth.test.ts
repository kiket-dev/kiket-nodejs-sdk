/**
 * Tests for HMAC signature verification.
 */
import { verifySignature, generateSignature, AuthenticationError } from '../auth';

describe('Auth', () => {
  const secret = 'test-secret';
  const body = JSON.stringify({ test: 'payload' });

  describe('generateSignature', () => {
    it('should generate a valid signature', () => {
      const { signature, timestamp } = generateSignature(secret, body);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // SHA-256 hex
      expect(timestamp).toBeDefined();
    });

    it('should use provided timestamp', () => {
      const ts = 1234567890;
      const { timestamp } = generateSignature(secret, body, ts);

      expect(timestamp).toBe(ts.toString());
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const { signature, timestamp } = generateSignature(secret, body);

      expect(() =>
        verifySignature(secret, body, {
          'X-Kiket-Signature': signature,
          'X-Kiket-Timestamp': timestamp,
        })
      ).not.toThrow();
    });

    it('should reject missing secret', () => {
      expect(() => verifySignature(undefined, body, {})).toThrow(AuthenticationError);
    });

    it('should reject missing signature header', () => {
      expect(() =>
        verifySignature(secret, body, { 'X-Kiket-Timestamp': '123' })
      ).toThrow(AuthenticationError);
    });

    it('should reject missing timestamp header', () => {
      expect(() =>
        verifySignature(secret, body, { 'X-Kiket-Signature': 'abc' })
      ).toThrow(AuthenticationError);
    });

    it('should reject invalid signature', () => {
      const { timestamp } = generateSignature(secret, body);

      expect(() =>
        verifySignature(secret, body, {
          'X-Kiket-Signature': 'invalid',
          'X-Kiket-Timestamp': timestamp,
        })
      ).toThrow(AuthenticationError);
    });

    it('should reject old timestamps', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const { signature } = generateSignature(secret, body, oldTimestamp);

      expect(() =>
        verifySignature(secret, body, {
          'X-Kiket-Signature': signature,
          'X-Kiket-Timestamp': oldTimestamp.toString(),
        })
      ).toThrow(AuthenticationError);
    });

    it('should reject future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400 seconds in future
      const { signature } = generateSignature(secret, body, futureTimestamp);

      expect(() =>
        verifySignature(secret, body, {
          'X-Kiket-Signature': signature,
          'X-Kiket-Timestamp': futureTimestamp.toString(),
        })
      ).toThrow(AuthenticationError);
    });
  });
});
