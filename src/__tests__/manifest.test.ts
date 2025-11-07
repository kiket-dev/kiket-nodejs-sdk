/**
 * Tests for manifest loader.
 */
import { settingsDefaults, secretKeys, applySecretEnvOverrides } from '../manifest';
import { ExtensionManifest } from '../types';

describe('Manifest', () => {
  describe('settingsDefaults', () => {
    it('should extract settings defaults', () => {
      const manifest: ExtensionManifest = {
        id: 'test',
        version: '1.0.0',
        settings: [
          { key: 'API_KEY', secret: true },
          { key: 'MAX_RETRIES', default: 3 },
          { key: 'TIMEOUT', default: 5000 },
        ],
      };

      const defaults = settingsDefaults(manifest);

      expect(defaults).toEqual({
        MAX_RETRIES: 3,
        TIMEOUT: 5000,
      });
    });

    it('should return empty object for manifest without settings', () => {
      const manifest: ExtensionManifest = {
        id: 'test',
        version: '1.0.0',
      };

      expect(settingsDefaults(manifest)).toEqual({});
    });

    it('should return empty object for null manifest', () => {
      expect(settingsDefaults(null)).toEqual({});
    });
  });

  describe('secretKeys', () => {
    it('should extract secret keys', () => {
      const manifest: ExtensionManifest = {
        id: 'test',
        version: '1.0.0',
        settings: [
          { key: 'API_KEY', secret: true },
          { key: 'API_SECRET', secret: true },
          { key: 'MAX_RETRIES', default: 3 },
        ],
      };

      const keys = secretKeys(manifest);

      expect(keys).toEqual(['API_KEY', 'API_SECRET']);
    });

    it('should return empty array for manifest without secrets', () => {
      const manifest: ExtensionManifest = {
        id: 'test',
        version: '1.0.0',
        settings: [{ key: 'MAX_RETRIES', default: 3 }],
      };

      expect(secretKeys(manifest)).toEqual([]);
    });

    it('should return empty array for null manifest', () => {
      expect(secretKeys(null)).toEqual([]);
    });
  });

  describe('applySecretEnvOverrides', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should apply environment variable overrides', () => {
      process.env.KIKET_SECRET_API_KEY = 'env-api-key';
      process.env.KIKET_SECRET_API_SECRET = 'env-secret';

      const settings = {
        API_KEY: 'default-key',
        MAX_RETRIES: 3,
      };

      const updated = applySecretEnvOverrides(settings, ['API_KEY', 'API_SECRET']);

      expect(updated).toEqual({
        API_KEY: 'env-api-key',
        API_SECRET: 'env-secret',
        MAX_RETRIES: 3,
      });
    });

    it('should not override if env var not set', () => {
      const settings = {
        API_KEY: 'default-key',
      };

      const updated = applySecretEnvOverrides(settings, ['API_KEY']);

      expect(updated).toEqual({
        API_KEY: 'default-key',
      });
    });
  });
});
