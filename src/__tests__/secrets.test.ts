/**
 * Tests for secret manager.
 */
import { KiketSecretManager } from '../secrets';
import { KiketClient } from '../types';

describe('KiketSecretManager', () => {
  let mockClient: jest.Mocked<KiketClient>;
  let secretManager: KiketSecretManager;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<KiketClient>;

    secretManager = new KiketSecretManager(mockClient, 'test-extension');
  });

  describe('get', () => {
    it('should get a secret value', async () => {
      mockClient.get.mockResolvedValue({ value: 'secret-value' });

      const result = await secretManager.get('API_KEY');

      expect(result).toBe('secret-value');
      expect(mockClient.get).toHaveBeenCalledWith('/extensions/test-extension/secrets/API_KEY');
    });

    it('should return null when secret not found', async () => {
      mockClient.get.mockRejectedValue(new Error('404: Not Found'));

      const result = await secretManager.get('MISSING_KEY');

      expect(result).toBeNull();
    });

    it('should throw error when extension ID not provided', async () => {
      const manager = new KiketSecretManager(mockClient, undefined);

      await expect(manager.get('API_KEY')).rejects.toThrow('Extension ID required');
    });
  });

  describe('set', () => {
    it('should set a secret value', async () => {
      mockClient.post.mockResolvedValue({});

      await secretManager.set('API_KEY', 'new-value');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/extensions/test-extension/secrets/API_KEY',
        { value: 'new-value' }
      );
    });

    it('should throw error when extension ID not provided', async () => {
      const manager = new KiketSecretManager(mockClient, undefined);

      await expect(manager.set('API_KEY', 'value')).rejects.toThrow('Extension ID required');
    });
  });

  describe('delete', () => {
    it('should delete a secret', async () => {
      mockClient.delete.mockResolvedValue({});

      await secretManager.delete('API_KEY');

      expect(mockClient.delete).toHaveBeenCalledWith('/extensions/test-extension/secrets/API_KEY');
    });

    it('should throw error when extension ID not provided', async () => {
      const manager = new KiketSecretManager(mockClient, undefined);

      await expect(manager.delete('API_KEY')).rejects.toThrow('Extension ID required');
    });
  });

  describe('list', () => {
    it('should list all secret keys', async () => {
      mockClient.get.mockResolvedValue({ keys: ['API_KEY', 'SECRET_TOKEN'] });

      const result = await secretManager.list();

      expect(result).toEqual(['API_KEY', 'SECRET_TOKEN']);
      expect(mockClient.get).toHaveBeenCalledWith('/extensions/test-extension/secrets');
    });

    it('should throw error when extension ID not provided', async () => {
      const manager = new KiketSecretManager(mockClient, undefined);

      await expect(manager.list()).rejects.toThrow('Extension ID required');
    });
  });

  describe('rotate', () => {
    it('should rotate a secret', async () => {
      mockClient.delete.mockResolvedValue({});
      mockClient.post.mockResolvedValue({});

      await secretManager.rotate('API_KEY', 'new-value');

      expect(mockClient.delete).toHaveBeenCalledWith('/extensions/test-extension/secrets/API_KEY');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/extensions/test-extension/secrets/API_KEY',
        { value: 'new-value' }
      );
    });
  });
});
