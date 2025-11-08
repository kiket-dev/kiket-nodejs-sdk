/**
 * Tests for HTTP client.
 */
import { KiketHttpClient, KiketSDKError } from '../client';
import axios, { AxiosInstance } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockAxiosInstance extends Partial<AxiosInstance> {
  get: jest.MockedFunction<AxiosInstance['get']>;
  post?: jest.MockedFunction<AxiosInstance['post']>;
  put?: jest.MockedFunction<AxiosInstance['put']>;
  delete?: jest.MockedFunction<AxiosInstance['delete']>;
  interceptors: {
    request: { use: jest.Mock; eject: jest.Mock; clear: jest.Mock };
    response: { use: jest.Mock; eject: jest.Mock; clear: jest.Mock };
  };
}

function createMockAxiosInstance(overrides: Partial<MockAxiosInstance> = {}): MockAxiosInstance {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(() => 0),
        eject: jest.fn(),
        clear: jest.fn()
      },
      response: {
        use: jest.fn(() => 0),
        eject: jest.fn(),
        clear: jest.fn()
      },
    },
    ...overrides,
  };
}

describe('KiketHttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create.mockReturnValue(mockInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123', 'v1');
      expect(client).toBeDefined();
    });

    it('should inject extension api key header when provided', () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create.mockReturnValue(mockInstance as unknown as AxiosInstance);

      new KiketHttpClient('https://api.test.com', undefined, undefined, 'ext_key');
      const handler = mockInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} as Record<string, string> };
      handler(config);
      expect(config.headers['X-Kiket-API-Key']).toBe('ext_key');
    });
  });

  describe('get', () => {
    it('should make GET request with auth headers', async () => {
      const mockAxiosInstance = createMockAxiosInstance({
        get: jest.fn().mockResolvedValue({ data: { result: 'success' } }),
      });
      mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123', 'v1');
      const result = await client.get('/test');

      expect(result).toEqual({ result: 'success' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', expect.any(Object));
    });

    it('should handle errors', async () => {
      const mockAxiosInstance = createMockAxiosInstance();
      mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123');

      // Get the error handler that was registered
      const responseInterceptor = mockAxiosInstance.interceptors.response.use;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const errorHandler = responseInterceptor.mock.calls[0][1] as (error: unknown) => never;

      // Mock axios to reject with an axios error
      const axiosError = {
        response: { status: 404, statusText: 'Not Found', data: {} },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockImplementation(() => {
        throw errorHandler(axiosError);
      });

      await expect(client.get('/test')).rejects.toThrow(KiketSDKError);
    });
  });

  describe('post', () => {
    it('should make POST request with data', async () => {
      const mockAxiosInstance = createMockAxiosInstance({
        post: jest.fn().mockResolvedValue({ data: { id: '123' } }),
      });
      mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123');
      const result = await client.post('/test', { name: 'test' });

      expect(result).toEqual({ id: '123' });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { name: 'test' }, expect.any(Object));
    });
  });

  describe('put', () => {
    it('should make PUT request', async () => {
      const mockAxiosInstance = createMockAxiosInstance({
        put: jest.fn().mockResolvedValue({ data: { updated: true } }),
      });
      mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123');
      const result = await client.put('/test', { value: 'updated' });

      expect(result).toEqual({ updated: true });
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const mockAxiosInstance = createMockAxiosInstance({
        delete: jest.fn().mockResolvedValue({ data: { deleted: true } }),
      });
      mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123');
      const result = await client.delete('/test');

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('close', () => {
    it('should close client without error', async () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create.mockReturnValue(mockInstance as unknown as AxiosInstance);

      const client = new KiketHttpClient('https://api.test.com', 'token123');
      await expect(client.close()).resolves.toBeUndefined();
    });
  });
});
