/**
 * Telemetry reporter for SDK usage metrics.
 */
import axios from 'axios';
import { TelemetryRecord, FeedbackHook, TelemetryExtras } from './types';

/**
 * Telemetry reporter implementation.
 */
export class TelemetryReporter {
  private endpoint?: string;
  private apiKey?: string;
  private enabled: boolean;
  private feedbackHook?: FeedbackHook;
  private extensionId?: string;
  private extensionVersion?: string;

  constructor(
    enabled: boolean,
    telemetryUrl?: string,
    feedbackHook?: FeedbackHook,
    extensionId?: string,
    extensionVersion?: string,
    extensionApiKey?: string
  ) {
    // Check opt-out environment variable
    const optOut = (process.env.KIKET_SDK_TELEMETRY_OPTOUT || '').toLowerCase() === '1';
    this.enabled = enabled && !optOut;

    this.feedbackHook = feedbackHook;
    this.extensionId = extensionId;
    this.extensionVersion = extensionVersion;
    this.endpoint = this.resolveEndpoint(telemetryUrl);
    this.apiKey = extensionApiKey;
  }

  async record(
    event: string,
    version: string,
    status: 'ok' | 'error',
    durationMs: number,
    extras?: TelemetryExtras
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const record: TelemetryRecord = {
      event,
      version,
      status,
      durationMs,
      errorMessage: extras?.errorMessage,
      message: extras?.errorMessage,
      errorClass: extras?.errorClass,
      metadata: extras?.metadata ?? {},
      extensionId: this.extensionId,
      extensionVersion: this.extensionVersion,
      timestamp: new Date().toISOString(),
    };

    // Call feedback hook (if provided)
    if (this.feedbackHook) {
      try {
        await Promise.resolve(this.feedbackHook(record));
      } catch (error) {
        console.warn('Feedback hook failed:', error);
      }
    }

    // Send to telemetry URL (if configured)
    if (this.endpoint) {
      try {
        const headers: Record<string, string> = {};
        if (this.apiKey) {
          headers['X-Kiket-API-Key'] = this.apiKey;
        }
        await axios.post(this.endpoint, this.buildPayload(record), {
          headers,
          timeout: 5000,
        });
      } catch (error) {
        // Best-effort, don't fail the handler
        console.warn('Failed to send telemetry:', error);
      }
    }
  }

  private resolveEndpoint(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }
    const trimmed = url.replace(/\/+$/, '');
    if (trimmed.endsWith('/telemetry')) {
      return trimmed;
    }
    return `${trimmed}/telemetry`;
  }

  private buildPayload(record: TelemetryRecord) {
    const metadata = { ...(record.metadata ?? {}) };

    return {
      event: record.event,
      version: record.version,
      status: record.status,
      duration_ms: Math.round(record.durationMs),
      timestamp: record.timestamp,
      extension_id: record.extensionId,
      extension_version: record.extensionVersion,
      error_message: record.errorMessage ?? record.message,
      error_class: record.errorClass,
      metadata,
    };
  }
}
