/**
 * HMAC signature verification for webhook payloads.
 */
import * as crypto from 'crypto';
import { Headers } from './types';

/**
 * Authentication error.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Verify HMAC signature of a webhook payload.
 *
 * @param secret - Webhook secret
 * @param body - Request body (raw bytes)
 * @param headers - Request headers
 * @throws {AuthenticationError} If signature is invalid or missing
 */
export function verifySignature(
  secret: string | undefined,
  body: Buffer | string,
  headers: Headers
): void {
  if (!secret) {
    throw new AuthenticationError('Webhook secret not configured');
  }

  const signature = headers['x-kiket-signature'] || headers['X-Kiket-Signature'];
  const timestamp = headers['x-kiket-timestamp'] || headers['X-Kiket-Timestamp'];

  if (!signature) {
    throw new AuthenticationError('Missing X-Kiket-Signature header');
  }

  if (!timestamp) {
    throw new AuthenticationError('Missing X-Kiket-Timestamp header');
  }

  // Check timestamp to prevent replay attacks (allow 5 minute window)
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);

  if (isNaN(requestTime)) {
    throw new AuthenticationError('Invalid X-Kiket-Timestamp header');
  }

  const timeDiff = Math.abs(now - requestTime);
  if (timeDiff > 300) {
    throw new AuthenticationError(
      `Request timestamp too old or too far in future: ${timeDiff}s`
    );
  }

  // Compute expected signature
  const bodyStr = Buffer.isBuffer(body) ? body.toString('utf-8') : body;
  const payload = `${timestamp}.${bodyStr}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new AuthenticationError('Invalid signature');
  }
}

/**
 * Generate HMAC signature for a payload (for testing).
 *
 * @param secret - Webhook secret
 * @param body - Request body
 * @param timestamp - Unix timestamp (defaults to current time)
 * @returns Signature and timestamp
 */
export function generateSignature(
  secret: string,
  body: string,
  timestamp?: number
): { signature: string; timestamp: string } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const tsStr = ts.toString();
  const payload = `${tsStr}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return { signature, timestamp: tsStr };
}
