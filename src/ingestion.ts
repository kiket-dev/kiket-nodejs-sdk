/**
 * Platform ingestion helpers for evidence adapters (API-key scoped).
 */
import axios, { type AxiosInstance } from 'axios';
import pkg from '../package.json';

export interface PlatformIngestionClientConfig {
  baseUrl: string;
  apiKey: string;
  organizationId: string;
}

export interface IngestRawEventInput {
  workspaceId?: string;
  processId?: string;
  sourceSystem: string;
  sourceEventType: string;
  sourceEventId?: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  retentionPolicy?: Record<string, unknown>;
}

export interface ImportEvidenceInput {
  workspaceId?: string;
  processId?: string;
  caseId?: string;
  evidenceType: string;
  title: string;
  sourceSystem: string;
  sourceObjectId?: string;
  capturedAt?: string;
  payload?: Record<string, unknown>;
  retentionPolicy?: Record<string, unknown>;
  dedupeKey: string;
}

export class PlatformIngestionClient {
  private readonly axios: AxiosInstance;

  constructor(private readonly config: PlatformIngestionClientConfig) {
    const baseURL = config.baseUrl.replace(/\/$/, '');
    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${pkg.name}/${pkg.version}`,
        'X-API-Key': config.apiKey,
        'X-Organization-Id': config.organizationId,
      },
    });
  }

  async getIngestionContract(): Promise<Record<string, unknown>> {
    const response = await this.axios.get('/api/v1/platform/extension-ingestion/contract');
    return response.data as Record<string, unknown>;
  }

  async ingestRawEvent(input: IngestRawEventInput): Promise<{ rawEvent: Record<string, unknown>; duplicate: boolean }> {
    const response = await this.axios.post('/api/v1/platform/raw-events', input);
    return response.data as { rawEvent: Record<string, unknown>; duplicate: boolean };
  }

  async processRawEvent(rawEventId: string): Promise<Record<string, unknown>> {
    const response = await this.axios.post(`/api/v1/platform/raw-events/${rawEventId}/process`);
    return response.data as Record<string, unknown>;
  }

  async importEvidence(input: ImportEvidenceInput): Promise<Record<string, unknown>> {
    const response = await this.axios.post('/api/v1/platform/evidence', input);
    return response.data as Record<string, unknown>;
  }
}

export function createIngestionClient(config: PlatformIngestionClientConfig): PlatformIngestionClient {
  if (!config.apiKey.trim()) throw new Error('apiKey is required');
  if (!config.organizationId.trim()) throw new Error('organizationId is required');
  return new PlatformIngestionClient(config);
}
