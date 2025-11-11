/**
 * Tests for extension endpoints.
 */
import { KiketEndpoints } from '../endpoints';
import { KiketClient } from '../types';

describe('KiketEndpoints', () => {
  let mockClient: jest.Mocked<KiketClient>;
  let endpoints: KiketEndpoints;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<KiketClient>;

    endpoints = new KiketEndpoints(mockClient, 'test-extension', 'v1');
  });

  describe('logEvent', () => {
    it('should log an event', async () => {
      mockClient.post.mockResolvedValue({});

      await endpoints.logEvent('issue.created', { summary: 'Test Issue' });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/extensions/test-extension/events',
        expect.objectContaining({
          event: 'issue.created',
          version: 'v1',
          data: { summary: 'Test Issue' },
          timestamp: expect.any(String),
        })
      );
    });

    it('should throw error when extension ID not provided', async () => {
      const endpointsNoId = new KiketEndpoints(mockClient, undefined, 'v1');

      await expect(async () => await endpointsNoId.logEvent('test', {})).rejects.toThrow(
        'Extension ID required'
      );
    });
  });

  describe('getMetadata', () => {
    it('should get extension metadata', async () => {
      const metadata = { id: 'test-extension', version: '1.0.0' };
      mockClient.get.mockResolvedValue(metadata);

      const result = await endpoints.getMetadata();

      expect(result).toEqual(metadata);
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/extensions/test-extension');
    });

    it('should throw error when extension ID not provided', async () => {
      const endpointsNoId = new KiketEndpoints(mockClient, undefined, 'v1');

      await expect(async () => await endpointsNoId.getMetadata()).rejects.toThrow('Extension ID required');
    });
  });

  describe('secrets', () => {
    it('should provide access to secret manager', () => {
      expect(endpoints.secrets).toBeDefined();
    });
  });

  describe('customData', () => {
    it('should return custom data client bound to project', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const customData = endpoints.customData(7);
      await customData.list('com.example.module', 'records');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/custom_data/com.example.module/records',
        { params: { project_id: '7' } }
      );
    });
  });

  describe('slaEvents', () => {
    it('returns SLA events client bound to project', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const slaClient = endpoints.slaEvents('proj-9');
      await slaClient.list({ state: 'imminent' });

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/ext/sla/events', {
        params: expect.objectContaining({ project_id: 'proj-9', state: 'imminent' }),
      });
    });
  });

  describe('rateLimit', () => {
    it('returns rate limit metadata', async () => {
      mockClient.get.mockResolvedValue({
        rate_limit: {
          limit: 600,
          remaining: 598,
          window_seconds: 60,
          reset_in: 25,
        },
      });

      const result = await endpoints.rateLimit();

      expect(result).toEqual({
        limit: 600,
        remaining: 598,
        windowSeconds: 60,
        resetIn: 25,
      });
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/ext/rate_limit');
    });
  });
});
