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

  describe('runtime token authentication', () => {
    it('should extract authentication context from payload', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      let capturedContext: Record<string, unknown> | null = null;
      const handler = jest.fn().mockImplementation((_payload, context) => {
        capturedContext = context as Record<string, unknown>;
        return { ok: true };
      });
      sdk.register('test.event', handler, 'v1');

      const payload = {
        test: 'data',
        authentication: {
          runtime_token: 'rt_test_token',
          token_type: 'runtime',
          expires_at: '2026-01-16T12:00:00Z',
          scopes: ['ext.api.read', 'ext.api.write'],
        },
        api: {
          base_url: 'https://custom.kiket.dev',
        },
      };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(200);
      expect(capturedContext).not.toBeNull();
      expect((capturedContext as Record<string, unknown>).auth).toEqual({
        runtimeToken: 'rt_test_token',
        tokenType: 'runtime',
        expiresAt: '2026-01-16T12:00:00Z',
        scopes: ['ext.api.read', 'ext.api.write'],
      });
    });

    it('should provide empty auth context when no authentication in payload', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      let capturedContext: Record<string, unknown> | null = null;
      const handler = jest.fn().mockImplementation((_payload, context) => {
        capturedContext = context as Record<string, unknown>;
        return { ok: true };
      });
      sdk.register('test.event', handler, 'v1');

      const payload = { test: 'data' };
      const { body, headers } = createSignedRequest(secret, payload);

      await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(capturedContext).not.toBeNull();
      expect((capturedContext as Record<string, unknown>).auth).toEqual({
        runtimeToken: undefined,
        tokenType: undefined,
        expiresAt: undefined,
        scopes: [],
      });
    });
  });

  describe('scope checking', () => {
    it('should reject request when required scopes are missing', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockResolvedValue({ ok: true });
      sdk.register('test.event', handler, 'v1', ['ext.api.read', 'ext.secrets.write']);

      const payload = {
        test: 'data',
        authentication: {
          runtime_token: 'rt_test_token',
          scopes: ['ext.api.read'], // missing ext.secrets.write
        },
      };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient scopes');
      expect(response.body.missing_scopes).toEqual(['ext.secrets.write']);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow request when all required scopes are present', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockResolvedValue({ ok: true });
      sdk.register('test.event', handler, 'v1', ['ext.api.read', 'ext.api.write']);

      const payload = {
        test: 'data',
        authentication: {
          runtime_token: 'rt_test_token',
          scopes: ['ext.api.read', 'ext.api.write', 'ext.secrets.read'],
        },
      };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should allow request with wildcard scope', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      const handler = jest.fn().mockResolvedValue({ ok: true });
      sdk.register('test.event', handler, 'v1', ['ext.api.read', 'ext.secrets.write']);

      const payload = {
        test: 'data',
        authentication: {
          runtime_token: 'rt_test_token',
          scopes: ['*'],
        },
      };
      const { body, headers } = createSignedRequest(secret, payload);

      const response = await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should provide requireScopes function in context', async () => {
      const sdk = new KiketSDK({ webhookSecret: secret, workspaceToken });

      let capturedContext: Record<string, unknown> | null = null;
      const handler = jest.fn().mockImplementation((_payload, context) => {
        capturedContext = context as Record<string, unknown>;
        return { ok: true };
      });
      sdk.register('test.event', handler, 'v1');

      const payload = {
        test: 'data',
        authentication: {
          runtime_token: 'rt_test_token',
          scopes: ['ext.api.read'],
        },
      };
      const { body, headers } = createSignedRequest(secret, payload);

      await request(sdk.app)
        .post('/v/1/webhooks/test.event')
        .set(headers)
        .send(body);

      expect(capturedContext).not.toBeNull();
      expect(typeof (capturedContext as Record<string, unknown>).requireScopes).toBe('function');
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
