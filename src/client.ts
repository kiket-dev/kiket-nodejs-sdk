/**
 * HTTP client for Kiket API.
 */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { KiketClient, RequestOptions, Headers } from './types';

/**
 * Kiket SDK error.
 */
export class KiketSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KiketSDKError';
  }
}

/**
 * HTTP client implementation for Kiket API.
 */
export class KiketHttpClient implements KiketClient {
  private axios: AxiosInstance;
  private workspaceToken?: string;
  private eventVersion?: string;

  constructor(baseUrl: string, workspaceToken?: string, eventVersion?: string) {
    this.workspaceToken = workspaceToken;
    this.eventVersion = eventVersion;

    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'kiket-sdk-nodejs/0.1.0',
      },
    });

    // Add auth interceptor
    this.axios.interceptors.request.use((config) => {
      if (this.workspaceToken && config.headers) {
        config.headers['Authorization'] = `Bearer ${this.workspaceToken}`;
      }
      if (this.eventVersion && config.headers) {
        config.headers['X-Kiket-Event-Version'] = this.eventVersion;
      }
      return config;
    });

    // Add error interceptor
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const message =
            (error.response.data as { error?: string })?.error ||
            error.response.statusText ||
            'API request failed';
          throw new KiketSDKError(`${error.response.status}: ${message}`);
        } else if (error.request) {
          throw new KiketSDKError('No response from API');
        } else {
          throw new KiketSDKError(error.message);
        }
      }
    );
  }

  async get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    const config = this.buildConfig(options);
    const response = await this.axios.get<T>(path, config);
    return response.data;
  }

  async post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const config = this.buildConfig(options);
    const response = await this.axios.post<T>(path, data, config);
    return response.data;
  }

  async put<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const config = this.buildConfig(options);
    const response = await this.axios.put<T>(path, data, config);
    return response.data;
  }

  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    const config = this.buildConfig(options);
    const response = await this.axios.delete<T>(path, config);
    return response.data;
  }

  async close(): Promise<void> {
    // Axios doesn't require explicit cleanup, but we provide this for interface compliance
  }

  private buildConfig(options?: RequestOptions): AxiosRequestConfig {
    const config: AxiosRequestConfig = {};

    if (options?.headers) {
      config.headers = options.headers as Headers;
    }

    if (options?.timeout) {
      config.timeout = options.timeout;
    }

    if (options?.params) {
      config.params = options.params;
    }

    return config;
  }
}
