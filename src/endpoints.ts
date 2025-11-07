/**
 * High-level extension endpoints.
 */
import { ExtensionEndpoints, ExtensionSecretManager, KiketClient } from './types';
import { KiketSecretManager } from './secrets';

/**
 * Extension endpoints implementation.
 */
export class KiketEndpoints implements ExtensionEndpoints {
  public readonly secrets: ExtensionSecretManager;

  constructor(
    private client: KiketClient,
    private extensionId?: string,
    private eventVersion?: string
  ) {
    this.secrets = new KiketSecretManager(client, extensionId);
  }

  async logEvent(event: string, data: Record<string, unknown>): Promise<void> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for logging events');
    }

    await this.client.post(`/extensions/${this.extensionId}/events`, {
      event,
      version: this.eventVersion,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async getMetadata(): Promise<unknown> {
    if (!this.extensionId) {
      throw new Error('Extension ID required for getting metadata');
    }

    return await this.client.get(`/extensions/${this.extensionId}`);
  }
}
