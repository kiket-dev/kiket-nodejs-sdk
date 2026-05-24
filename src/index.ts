/**
 * Kiket SDK for Node.js/TypeScript
 *
 * Build and run Kiket extensions with a batteries-included, strongly-typed TypeScript toolkit.
 */

// Auth utilities
export { AuthenticationError, generateSignature, verifySignature } from './auth';
// Client
export { KiketHttpClient, KiketSDKError, ScopeError } from './client';
export { KiketCustomDataClient } from './custom_data';
// Endpoints
export { KiketEndpoints } from './endpoints';
export { KiketIntakeFormsClient } from './intake_forms';
// Manifest loader
export { applySecretEnvOverrides, loadManifest, secretKeys, settingsDefaults } from './manifest';
export {
  extensionManifestSchema,
  loadExtensionManifest,
  parseExtensionManifest,
  STARTER_EXTENSION_MANIFEST,
  validateExtensionManifestYaml,
  type ExtensionAdapterManifest,
} from './extension-manifest';
export {
  parseWebhookMappingConfig,
  STARTER_WEBHOOK_MAPPING,
  WebhookFieldMappingSchema,
  WebhookMappingConfigSchema,
  type WebhookFieldMapping,
  type WebhookMappingConfig,
} from './webhook-mapping';
export {
  createIngestionClient,
  PlatformIngestionClient,
  type ImportEvidenceInput,
  type IngestRawEventInput,
  type PlatformIngestionClientConfig,
} from './ingestion';
// Notifications
export type {
  ChannelValidationRequest,
  ChannelValidationResponse,
  NotificationRequest,
  NotificationResponse,
} from './notifications';
export { validateNotificationRequest } from './notifications';
// Registry
export { KiketHandlerRegistry } from './registry';
export type { AllowOptions, ExtensionResponse, ResponseMetadata, ResponseOptions } from './responses';
// Response helpers
export { allow, deny, pending } from './responses';
// Main SDK class
export { createApp, KiketSDK } from './sdk';
// Secrets
export { KiketSecretManager } from './secrets';
export { KiketSlaEventsClient } from './sla';
// Telemetry
export { TelemetryReporter } from './telemetry';
// Types
export type {
  AuthenticationContext,
  CustomDataClient,
  ExtensionEndpoints,
  ExtensionManifest,
  ExtensionSecretManager,
  FeedbackHook,
  HandlerContext,
  HandlerMetadata,
  HandlerRegistry,
  Headers,
  IntakeForm,
  IntakeFormField,
  IntakeFormListOptions,
  IntakeFormListResponse,
  IntakeFormStats,
  IntakeFormsClient,
  IntakeSubmission,
  IntakeSubmissionCreateOptions,
  IntakeSubmissionListOptions,
  IntakeSubmissionListResponse,
  KiketClient,
  RequestOptions,
  ScopeChecker,
  SDKConfig,
  Settings,
  TelemetryExtras,
  TelemetryRecord,
  WebhookHandler,
  WebhookPayload,
} from './types';
