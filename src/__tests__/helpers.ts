/**
 * Test utilities for Kiket SDK.
 */
import { generateSignature } from '../auth';
import { WebhookPayload, Headers } from '../types';

/**
 * Create a signed webhook payload for testing.
 */
export function createSignedPayload(
  secret: string,
  payload: WebhookPayload,
  timestamp?: number
): { body: string; headers: Headers } {
  const body = JSON.stringify(payload);
  const { signature, timestamp: ts } = generateSignature(secret, body, timestamp);

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Kiket-Signature': signature,
      'X-Kiket-Timestamp': ts,
    },
  };
}

/**
 * Create a test handler context.
 */
export function createTestContext(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'test.event',
    eventVersion: 'v1',
    headers: {},
    client: createMockClient(),
    endpoints: createMockEndpoints(),
    settings: {},
    extensionId: 'test-extension',
    extensionVersion: '1.0.0',
    secrets: createMockSecretManager(),
    ...overrides,
  };
}

/**
 * Create a mock Kiket client.
 */
export function createMockClient(): {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  close: jest.Mock;
} {
  return {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create mock endpoints.
 */
export function createMockEndpoints(): {
  secrets: ReturnType<typeof createMockSecretManager>;
  logEvent: jest.Mock;
  getMetadata: jest.Mock;
} {
  const secrets = createMockSecretManager();
  return {
    secrets,
    logEvent: jest.fn().mockResolvedValue(undefined),
    getMetadata: jest.fn().mockResolvedValue({}),
  };
}

/**
 * Create a mock secret manager.
 */
export function createMockSecretManager(): {
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  list: jest.Mock;
  rotate: jest.Mock;
} {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue([]),
    rotate: jest.fn().mockResolvedValue(undefined),
  };
}
