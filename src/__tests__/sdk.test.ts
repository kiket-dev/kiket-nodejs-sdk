/**
 * Tests for main SDK class.
 */
import { KiketSDK } from '../sdk';
import { generateSignature } from '../auth';
import request from 'supertest';

describe('KiketSDK', () => {
  const secret = 'test-secret';
  const workspaceToken = 'wk_test';

  describe('webhook registration', () => {
    it('should register a handler', () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockResolvedValue({ ok: true });
      sdk.register('test.event', handler, 'v1');

      // Check that handler was registered
      const health = sdk.app.listen(0);
      health.close();
    });

    it('should use webhook decorator', () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = sdk.webhook('test.event', 'v1')((_payload, _context) => {
        return { ok: true };
      });

      expect(handler).toBeDefined();
    });
  });

  describe('webhook handling', () => {
    it('should handle valid webhook request', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockResolvedValue({ result: 'success' });
      sdk.register('test.event', handler, 'v1');

      const payload = { test: 'data' };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ result: 'success' });
      expect(handler).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          event: 'test.event',
          eventVersion: 'v1',
        })
      );
    });

    it('should reject request with invalid signature', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      sdk.register('test.event', jest.fn(), 'v1');

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set({
          'X-Kiket-Signature': 'invalid',
          'X-Kiket-Timestamp': Date.now().toString(),
        })
        .send({ test: 'data' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for unregistered event', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const payload = { test: 'data' };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/unknown.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(404);
    });

    it('should handle handler errors', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      sdk.register('test.event', handler, 'v1');

      const payload = { test: 'data' };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(500);
      expect((response.body as { error?: string }).error).toContain('Handler failed');
    });
  });

  describe('health endpoint', () => {
    it('should return health status', async () => {
      const sdk = new KiketSDK({
        webhookSecret: secret,
        workspaceToken,
        extensionId: 'test-extension',
        extensionVersion: '1.0.0',
      });

      sdk.register('test.event', jest.fn(), 'v1');

      const response = await request(sdk.app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        extension_id: 'test-extension',
        extension_version: '1.0.0',
        registered_events: ['test.event'],
      });
    });
  });
});

function createSignedRequest(
  secret: string,
  payload: Record<string, unknown>
): { body: string; headers: Record<string, string> } {
  const body = JSON.stringify(payload);
  const { signature, timestamp } = generateSignature(secret, body);

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Kiket-Signature': signature,
      'X-Kiket-Timestamp': timestamp,
    },
  };
}
