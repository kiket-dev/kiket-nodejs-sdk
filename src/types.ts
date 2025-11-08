/**
 * Core type definitions for the Kiket SDK.
 */

/**
 * Generic webhook payload structure.
 */
export type WebhookPayload = Record<string, unknown>;

/**
 * HTTP headers dictionary.
 */
export type Headers = Record<string, string>;

/**
 * Extension settings configuration.
 */
export type Settings = Record<string, unknown>;

/**
 * Webhook handler function signature.
 */
export type WebhookHandler<TPayload = WebhookPayload, TResult = unknown> = (
  payload: TPayload,
  context: HandlerContext
) => Promise<TResult> | TResult;

/**
 * Context passed to webhook handlers.
 */
export interface HandlerContext {
  /** Event name (e.g., "issue.created") */
  event: string;
  /** Event version (e.g., "v1", "v2") */
  eventVersion: string;
  /** Request headers */
  headers: Readonly<Headers>;
  /** Kiket API client */
  client: KiketClient;
  /** High-level extension endpoints */
  endpoints: ExtensionEndpoints;
  /** Extension settings */
  settings: Readonly<Settings>;
  /** Extension identifier */
  extensionId?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Secret manager */
  secrets: ExtensionSecretManager;
}

/**
 * SDK configuration options.
 */
export interface SDKConfig {
  /** Webhook HMAC secret for signature verification */
  webhookSecret?: string;
  /** Workspace token for API authentication */
  workspaceToken?: string;
  /** Extension API key for `/api/v1/ext` endpoints */
  extensionApiKey?: string;
  /** Kiket API base URL */
  baseUrl?: string;
  /** Extension settings */
  settings?: Settings;
  /** Extension identifier */
  extensionId?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Path to manifest file (extension.yaml or manifest.yaml) */
  manifestPath?: string;
  /** Auto-load secrets from KIKET_SECRET_* environment variables */
  autoEnvSecrets?: boolean;
  /** Enable telemetry reporting */
  telemetryEnabled?: boolean;
  /** Custom feedback hook for telemetry */
  feedbackHook?: FeedbackHook;
  /** Telemetry reporting URL */
  telemetryUrl?: string;
}

/**
 * Extension manifest structure.
 */
export interface ExtensionManifest {
  /** Extension identifier */
  id: string;
  /** Extension version */
  version: string;
  /** Webhook delivery secret */
  delivery_secret?: string;
  /** Settings with defaults */
  settings?: Array<{
    key: string;
    default?: unknown;
    secret?: boolean;
  }>;
}

/**
 * Telemetry record structure.
 */
export interface TelemetryRecord {
  /** Event name */
  event: string;
  /** Event version */
  version: string;
  /** Handler execution status */
  status: 'ok' | 'error';
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Error message (if status is 'error') */
  message?: string;
  /** Extension identifier */
  extensionId?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Feedback hook for telemetry.
 */
export type FeedbackHook = (record: TelemetryRecord) => Promise<void> | void;

/**
 * Kiket API client interface.
 */
export interface KiketClient {
  /** Make a GET request */
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  /** Make a POST request */
  post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  /** Make a PUT request */
  put<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  /** Make a PATCH request */
  patch<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  /** Make a DELETE request */
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  /** Close the client connection */
  close(): Promise<void>;
}

/**
 * HTTP request options.
 */
export interface RequestOptions {
  /** Additional headers */
  headers?: Headers;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Query parameters */
  params?: Record<string, string>;
}

/**
 * Extension endpoints interface.
 */
export interface ExtensionEndpoints {
  /** Secret manager */
  secrets: ExtensionSecretManager;
  /** Log an event */
  logEvent(event: string, data: Record<string, unknown>): Promise<void>;
  /** Get extension metadata */
  getMetadata(): Promise<unknown>;
  /** Access custom data API */
  customData(projectId: number | string): CustomDataClient;
}

/**
 * Secret manager interface.
 */
export interface ExtensionSecretManager {
  /** Get a secret value */
  get(key: string): Promise<string | null>;
  /** Set a secret value */
  set(key: string, value: string): Promise<void>;
  /** Delete a secret */
  delete(key: string): Promise<void>;
  /** List all secret keys */
  list(): Promise<string[]>;
  /** Rotate a secret (delete old, set new) */
  rotate(key: string, newValue: string): Promise<void>;
}

/**
 * Custom data client.
 */
export interface CustomDataClient {
  list(
    moduleKey: string,
    table: string,
    options?: CustomDataListOptions
  ): Promise<CustomDataListResponse>;
  get(moduleKey: string, table: string, recordId: string | number): Promise<CustomDataRecordResponse>;
  create(
    moduleKey: string,
    table: string,
    record: Record<string, unknown>
  ): Promise<CustomDataRecordResponse>;
  update(
    moduleKey: string,
    table: string,
    recordId: string | number,
    record: Record<string, unknown>
  ): Promise<CustomDataRecordResponse>;
  delete(moduleKey: string, table: string, recordId: string | number): Promise<void>;
}

export interface CustomDataListOptions {
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface CustomDataListResponse {
  data: Array<Record<string, unknown>>;
}

export interface CustomDataRecordResponse {
  data: Record<string, unknown>;
}

/**
 * Webhook handler metadata.
 */
export interface HandlerMetadata {
  event: string;
  version: string;
  handler: WebhookHandler;
}

/**
 * Handler registry interface.
 */
export interface HandlerRegistry {
  /** Register a handler */
  register(event: string, handler: WebhookHandler, version: string): void;
  /** Get a handler for an event and version */
  get(event: string, version: string): HandlerMetadata | null;
  /** Get all registered event names */
  eventNames(): string[];
  /** Get all handlers */
  all(): HandlerMetadata[];
}
