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
export function createMockClient(): jest.Mocked<{
  get: <T = unknown>() => Promise<T>;
  post: <T = unknown>() => Promise<T>;
  put: <T = unknown>() => Promise<T>;
  delete: <T = unknown>() => Promise<T>;
  close: () => Promise<void>;
}> {
  return {
    get: jest.fn().mockResolvedValue({}) as jest.MockedFunction<() => Promise<unknown>>,
    post: jest.fn().mockResolvedValue({}) as jest.MockedFunction<() => Promise<unknown>>,
    put: jest.fn().mockResolvedValue({}) as jest.MockedFunction<() => Promise<unknown>>,
    delete: jest.fn().mockResolvedValue({}) as jest.MockedFunction<() => Promise<unknown>>,
    close: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<() => Promise<void>>,
  };
}

/**
 * Create mock endpoints.
 */
export function createMockEndpoints(): jest.Mocked<{
  secrets: ReturnType<typeof createMockSecretManager>;
  logEvent: (event: string, data: Record<string, unknown>) => Promise<void>;
  getMetadata: () => Promise<unknown>;
}> {
  const secrets = createMockSecretManager();
  return {
    secrets,
    logEvent: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
      (event: string, data: Record<string, unknown>) => Promise<void>
    >,
    getMetadata: jest.fn().mockResolvedValue({}) as jest.MockedFunction<() => Promise<unknown>>,
  };
}

/**
 * Create a mock secret manager.
 */
export function createMockSecretManager(): jest.Mocked<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<string[]>;
  rotate: (key: string, newValue: string) => Promise<void>;
}> {
  return {
    get: jest.fn().mockResolvedValue(null) as jest.MockedFunction<(key: string) => Promise<string | null>>,
    set: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
      (key: string, value: string) => Promise<void>
    >,
    delete: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<(key: string) => Promise<void>>,
    list: jest.fn().mockResolvedValue([]) as jest.MockedFunction<() => Promise<string[]>>,
    rotate: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
      (key: string, newValue: string) => Promise<void>
    >,
  };
}
