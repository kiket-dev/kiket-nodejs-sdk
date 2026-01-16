/**
 * Webhook handler registry.
 */
import { HandlerRegistry, HandlerMetadata, WebhookHandler } from './types';

/**
 * Handler registry implementation.
 */
export class KiketHandlerRegistry implements HandlerRegistry {
  private handlers: Map<string, HandlerMetadata> = new Map();

  register(event: string, handler: WebhookHandler, version: string, requiredScopes: string[] = []): void {
    const key = this.makeKey(event, version);
    this.handlers.set(key, { event, version, handler, requiredScopes });
  }

  get(event: string, version: string): HandlerMetadata | null {
    const key = this.makeKey(event, version);
    return this.handlers.get(key) || null;
  }

  eventNames(): string[] {
    const events = new Set<string>();
    for (const metadata of this.handlers.values()) {
      events.add(metadata.event);
    }
    return Array.from(events);
  }

  all(): HandlerMetadata[] {
    return Array.from(this.handlers.values());
  }

  private makeKey(event: string, version: string): string {
    return `${event}:${version}`;
  }
}
