/**
 * Telemetry reporter for SDK usage metrics.
 */
import axios, { AxiosInstance } from 'axios';
import { TelemetryRecord, FeedbackHook } from './types';

/**
 * Telemetry reporter implementation.
 */
export class TelemetryReporter {
  private axios?: AxiosInstance;
  private enabled: boolean;
  private feedbackHook?: FeedbackHook;
  private extensionId?: string;
  private extensionVersion?: string;

  constructor(
    enabled: boolean,
    telemetryUrl?: string,
    feedbackHook?: FeedbackHook,
    extensionId?: string,
    extensionVersion?: string
  ) {
    // Check opt-out environment variable
    const optOut = process.env.KIKET_SDK_TELEMETRY_OPTOUT === '1';
    this.enabled = enabled && !optOut;

    this.feedbackHook = feedbackHook;
    this.extensionId = extensionId;
    this.extensionVersion = extensionVersion;

    if (telemetryUrl) {
      this.axios = axios.create({
        baseURL: telemetryUrl,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async record(
    event: string,
    version: string,
    status: 'ok' | 'error',
    durationMs: number,
    message?: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const record: TelemetryRecord = {
      event,
      version,
      status,
      durationMs,
      message,
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
    if (this.axios) {
      try {
        await this.axios.post('/telemetry', record);
      } catch (error) {
        // Best-effort, don't fail the handler
        console.warn('Failed to send telemetry:', error);
      }
    }
  }
}
