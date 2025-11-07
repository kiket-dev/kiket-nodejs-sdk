/**
 * Extension secret manager.
 */
import { ExtensionSecretManager, KiketClient } from './types';

/**
 * Secret manager implementation using Kiket API.
 */
export class KiketSecretManager implements ExtensionSecretManager {
  constructor(
    private client: KiketClient,
    private extensionId?: string
  ) {}

  async get(key: string): Promise<string | null> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for secret operations');
    }

    try {
      const response = await this.client.get<{ value: string }>(
        `/extensions/${this.extensionId}/secrets/${key}`
      );
      return response.value;
    } catch (error) {
      // Return null if secret doesn't exist (404)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for secret operations');
    }

    await this.client.post(`/extensions/${this.extensionId}/secrets/${key}`, {
      value,
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for secret operations');
    }

    await this.client.delete(`/extensions/${this.extensionId}/secrets/${key}`);
  }

  async list(): Promise<string[]> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for secret operations');
    }

    const response = await this.client.get<{ keys: string[] }>(
      `/extensions/${this.extensionId}/secrets`
    );
    return response.keys;
  }

  async rotate(key: string, newValue: string): Promise<void> {
    // Delete old value, then set new one
    // Note: There's a small window where the secret doesn't exist
    await this.delete(key);
    await this.set(key, newValue);
  }
}
