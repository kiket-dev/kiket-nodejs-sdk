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
  errorMessage?: string;
  /** @deprecated Use errorMessage instead */
  message?: string;
  /** Error class (if status is 'error') */
  errorClass?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Extension identifier */
  extensionId?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Timestamp */
  timestamp: string;
}

export interface TelemetryExtras {
  errorMessage?: string;
  errorClass?: string;
  metadata?: Record<string, unknown>;
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
  /** Access workflow SLA events */
  slaEvents(projectId: number | string): SlaEventsClient;
  /** Access intake forms API */
  intakeForms(projectId: number | string): IntakeFormsClient;
  /** Inspect current rate limit window */
  rateLimit(): Promise<RateLimitInfo>;
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
 * Rate limit metadata returned by `/api/v1/ext/rate_limit`.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the current window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Seconds until the window resets */
  resetIn: number;
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

/**
 * SLA events client.
 */
export interface SlaEventsClient {
  list(options?: SlaEventsListOptions): Promise<SlaEventsListResponse>;
}

export interface SlaEventsListOptions {
  issueId?: string | number;
  state?: 'imminent' | 'breached' | 'recovered';
  limit?: number;
}

export interface SlaEventRecord {
  id: number | string;
  issue_id: number | string;
  project_id: number | string;
  state: string;
  triggered_at: string;
  resolved_at?: string | null;
  definition?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface SlaEventsListResponse {
  data: SlaEventRecord[];
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
 * Intake form field definition.
 */
export interface IntakeFormField {
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

/**
 * Intake form definition.
 */
export interface IntakeForm {
  id: number;
  key: string;
  name: string;
  description?: string;
  active: boolean;
  public: boolean;
  fields: IntakeFormField[];
  formUrl?: string;
  embedAllowed: boolean;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Intake submission.
 */
export interface IntakeSubmission {
  id: number;
  intakeFormId: number;
  status: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  submittedByEmail?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Intake form statistics.
 */
export interface IntakeFormStats {
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
  period?: string;
}

/**
 * Options for listing intake forms.
 */
export interface IntakeFormListOptions {
  active?: boolean;
  publicOnly?: boolean;
  limit?: number;
}

/**
 * Response from listing intake forms.
 */
export interface IntakeFormListResponse {
  data: IntakeForm[];
}

/**
 * Options for listing submissions.
 */
export interface IntakeSubmissionListOptions {
  status?: string;
  limit?: number;
  since?: Date | string;
}

/**
 * Response from listing submissions.
 */
export interface IntakeSubmissionListResponse {
  data: IntakeSubmission[];
}

/**
 * Options for creating a submission.
 */
export interface IntakeSubmissionCreateOptions {
  metadata?: Record<string, unknown>;
}

/**
 * Intake forms client interface.
 */
export interface IntakeFormsClient {
  list(options?: IntakeFormListOptions): Promise<IntakeFormListResponse>;
  get(formKey: string): Promise<IntakeForm>;
  publicUrl(form: IntakeForm): string | null;
  listSubmissions(formKey: string, options?: IntakeSubmissionListOptions): Promise<IntakeSubmissionListResponse>;
  getSubmission(formKey: string, submissionId: string | number): Promise<IntakeSubmission>;
  createSubmission(formKey: string, data: Record<string, unknown>, options?: IntakeSubmissionCreateOptions): Promise<IntakeSubmission>;
  approveSubmission(formKey: string, submissionId: string | number, notes?: string): Promise<IntakeSubmission>;
  rejectSubmission(formKey: string, submissionId: string | number, notes?: string): Promise<IntakeSubmission>;
  stats(formKey: string, period?: string): Promise<IntakeFormStats>;
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
