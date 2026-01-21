/**
 * Tests for the SDK secret helper functionality.
 */
import { KiketSDK } from '../sdk';
import type { SecretHelper } from '../types';

// Disable unsafe-* rules for this test file since we need to access private methods
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

describe('KiketSDK secret helper', () => {
  // Test the buildSecretHelper method by accessing it through reflection
  // since it's a private method
  const sdk = new KiketSDK({
    workspaceToken: 'test-token',
    extensionId: 'test-extension',
    telemetryEnabled: false,
  });

  // Access private method for testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildSecretHelper = (sdk as any).buildSecretHelper.bind(sdk) as (
    payloadSecrets: Record<string, string>
  ) => SecretHelper;

  describe('buildSecretHelper', () => {
    it('returns payload secret when present', () => {
      const payloadSecrets = { SLACK_TOKEN: 'payload-token', API_KEY: 'payload-key' };
      const secretHelper = buildSecretHelper(payloadSecrets);

      expect(secretHelper('SLACK_TOKEN')).toBe('payload-token');
      expect(secretHelper('API_KEY')).toBe('payload-key');
    });

    it('falls back to ENV when payload secret is missing', () => {
      const originalEnv = process.env.ENV_SECRET;
      process.env.ENV_SECRET = 'env-value';

      try {
        const payloadSecrets = {};
        const secretHelper = buildSecretHelper(payloadSecrets);

        expect(secretHelper('ENV_SECRET')).toBe('env-value');
      } finally {
        if (originalEnv !== undefined) {
          process.env.ENV_SECRET = originalEnv;
        } else {
          delete process.env.ENV_SECRET;
        }
      }
    });

    it('returns undefined when secret is not in payload or ENV', () => {
      const originalEnv = process.env.NONEXISTENT;
      delete process.env.NONEXISTENT;

      try {
        const payloadSecrets = {};
        const secretHelper = buildSecretHelper(payloadSecrets);

        expect(secretHelper('NONEXISTENT')).toBeUndefined();
      } finally {
        if (originalEnv !== undefined) {
          process.env.NONEXISTENT = originalEnv;
        }
      }
    });

    it('payload secrets take priority over ENV', () => {
      const originalEnv = process.env.SHARED_KEY;
      process.env.SHARED_KEY = 'from-env';

      try {
        const payloadSecrets = { SHARED_KEY: 'from-payload' };
        const secretHelper = buildSecretHelper(payloadSecrets);

        expect(secretHelper('SHARED_KEY')).toBe('from-payload');
      } finally {
        if (originalEnv !== undefined) {
          process.env.SHARED_KEY = originalEnv;
        } else {
          delete process.env.SHARED_KEY;
        }
      }
    });

    it('empty payload secret falls back to ENV', () => {
      const originalEnv = process.env.EMPTY_KEY;
      process.env.EMPTY_KEY = 'env-value';

      try {
        // Empty string is falsy, so it should fall back to ENV
        const payloadSecrets = { EMPTY_KEY: '' };
        const secretHelper = buildSecretHelper(payloadSecrets);

        expect(secretHelper('EMPTY_KEY')).toBe('env-value');
      } finally {
        if (originalEnv !== undefined) {
          process.env.EMPTY_KEY = originalEnv;
        } else {
          delete process.env.EMPTY_KEY;
        }
      }
    });

    it('works with empty payload secrets dictionary', () => {
      const originalEnv = process.env.ONLY_IN_ENV;
      process.env.ONLY_IN_ENV = 'env-only-value';

      try {
        const payloadSecrets = {};
        const secretHelper = buildSecretHelper(payloadSecrets);

        expect(secretHelper('ONLY_IN_ENV')).toBe('env-only-value');
      } finally {
        if (originalEnv !== undefined) {
          process.env.ONLY_IN_ENV = originalEnv;
        } else {
          delete process.env.ONLY_IN_ENV;
        }
      }
    });
  });
});
