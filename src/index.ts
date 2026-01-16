/**
 * Kiket SDK for Node.js/TypeScript
 *
 * Build and run Kiket extensions with a batteries-included, strongly-typed TypeScript toolkit.
 */

// Main SDK class
export { KiketSDK, createApp } from './sdk';

// Types
export type {
  WebhookPayload,
  Headers,
  Settings,
  WebhookHandler,
  HandlerContext,
  SDKConfig,
  ExtensionManifest,
  TelemetryRecord,
  TelemetryExtras,
  FeedbackHook,
  KiketClient,
  RequestOptions,
  ExtensionEndpoints,
  ExtensionSecretManager,
  CustomDataClient,
  IntakeFormsClient,
  IntakeForm,
  IntakeFormField,
  IntakeSubmission,
  IntakeFormStats,
  IntakeFormListOptions,
  IntakeFormListResponse,
  IntakeSubmissionListOptions,
  IntakeSubmissionListResponse,
  IntakeSubmissionCreateOptions,
  HandlerMetadata,
  HandlerRegistry,
  AuthenticationContext,
  ScopeChecker,
} from './types';

// Notifications
export type {
  NotificationRequest,
  NotificationResponse,
  ChannelValidationRequest,
  ChannelValidationResponse,
} from './notifications';
export { validateNotificationRequest } from './notifications';

// Auth utilities
export { verifySignature, generateSignature, AuthenticationError } from './auth';

// Client
export { KiketHttpClient, KiketSDKError, ScopeError } from './client';

// Endpoints
export { KiketEndpoints } from './endpoints';
export { KiketCustomDataClient } from './custom_data';
export { KiketSlaEventsClient } from './sla';
export { KiketIntakeFormsClient } from './intake_forms';

// Secrets
export { KiketSecretManager } from './secrets';

// Telemetry
export { TelemetryReporter } from './telemetry';

// Registry
export { KiketHandlerRegistry } from './registry';

// Manifest loader
export { loadManifest, settingsDefaults, secretKeys, applySecretEnvOverrides } from './manifest';
