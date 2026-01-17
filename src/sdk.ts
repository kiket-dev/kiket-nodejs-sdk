/**
 * Core SDK class and Express integration.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import {
  SDKConfig,
  WebhookHandler,
  HandlerContext,
  ExtensionManifest,
  Settings,
  TelemetryRecord,
} from './types';
import { verifyRuntimeToken, buildAuthContext, AuthenticationError } from './auth';
import { KiketHttpClient, KiketSDKError, ScopeError } from './client';
import { KiketEndpoints } from './endpoints';
import { KiketHandlerRegistry } from './registry';
import { TelemetryReporter } from './telemetry';
import {
  loadManifest,
  settingsDefaults,
  secretKeys,
  applySecretEnvOverrides,
} from './manifest';

/**
 * Main entrypoint for building Kiket extensions.
 */
export class KiketSDK {
  private config: ResolvedConfig;
  private registry: KiketHandlerRegistry;
  private telemetry: TelemetryReporter;
  public readonly app: Express;
  public readonly manifest: ExtensionManifest | null;

  constructor(config: SDKConfig = {}) {
    this.manifest = loadManifest(config.manifestPath);
    this.config = this.resolveConfig(config, this.manifest);
    this.registry = new KiketHandlerRegistry();
    this.telemetry = new TelemetryReporter(
      this.config.telemetryEnabled,
      this.config.telemetryUrl,
      this.config.feedbackHook,
      this.config.extensionId,
      this.config.extensionVersion
    );
    this.app = this.buildApp();
  }

  // ------------------------------------------------------------------
  // Registration API
  // ------------------------------------------------------------------

  /**
   * Register a webhook handler.
   * @param event Event name
   * @param handler Handler function
   * @param version Event version
   * @param requiredScopes Scopes required to execute this handler
   */
  register(event: string, handler: WebhookHandler, version: string, requiredScopes: string[] = []): void {
    this.registry.register(event, handler, version, requiredScopes);
  }

  /**
   * Webhook decorator for registering handlers.
   * @param event Event name
   * @param version Event version
   * @param requiredScopes Scopes required to execute this handler
   */
  webhook(event: string, version: string, requiredScopes: string[] = []): (handler: WebhookHandler) => WebhookHandler {
    return (handler: WebhookHandler) => {
      this.register(event, handler, version, requiredScopes);
      return handler;
    };
  }

  /**
   * Load all webhook handlers from a module.
   */
  load(module: Record<string, unknown>): void {
    for (const key of Object.keys(module)) {
      const func = module[key];
      if (typeof func === 'function') {
        const event = (func as WebhookHandler & { __kiket_event__?: string }).__kiket_event__;
        const version = (func as WebhookHandler & { __kiket_version__?: string }).__kiket_version__;

        if (event && version) {
          this.registry.register(event, func as WebhookHandler, version);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Runtime API
  // ------------------------------------------------------------------

  /**
   * Start the Express server.
   */
  run(host = '127.0.0.1', port = 8000): void {
    this.app.listen(port, host, () => {
      console.log(`🚀 Kiket extension listening on http://${host}:${port}`);
      console.log(`📦 Extension: ${this.config.extensionId || 'unknown'}`);
      console.log(`📝 Registered events: ${this.registry.eventNames().join(', ') || 'none'}`);
    });
  }

  // ------------------------------------------------------------------
  // Internal Express setup
  // ------------------------------------------------------------------

  private buildApp(): Express {
    const app = express();

    // Store raw body for signature verification
    app.use(express.json({
      verify: (req: Request, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      }
    }));

    // Webhook dispatch handler
    const dispatchHandler = async (req: Request, res: Response): Promise<void> => {
      const event = req.params.event;
      const pathVersion = req.params.version;

      try {
        // Parse payload
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Resolve API base URL from payload or config
        const apiBaseUrl = payload?.api?.base_url || this.config.baseUrl;

        // Verify JWT runtime token
        let jwtPayload;
        try {
          jwtPayload = await verifyRuntimeToken(payload, apiBaseUrl);
        } catch (error) {
          if (error instanceof AuthenticationError) {
            res.status(401).json({ error: error.message });
            return;
          }
          throw error;
        }

        // Determine version
        const requestedVersion =
          this.coerceOptional(pathVersion) ||
          this.coerceOptional(req.headers['x-kiket-event-version'] as string) ||
          this.coerceOptional(req.query.version as string);

        if (!requestedVersion) {
          res.status(400).json({
            error:
              'Event version required. Provide X-Kiket-Event-Version header, version query param, or /v/{version} path.',
          });
          return;
        }

        // Normalize version: try with 'v' prefix if just a number, or without if it has 'v'
        let metadata = this.registry.get(event, requestedVersion);
        if (!metadata) {
          const alternateVersion = /^\d+$/.test(requestedVersion)
            ? `v${requestedVersion}`
            : requestedVersion.replace(/^v/, '');
          metadata = this.registry.get(event, alternateVersion);
        }
        if (!metadata) {
          res.status(404).json({
            error: `No handler registered for event '${event}' with version '${requestedVersion}'`,
          });
          return;
        }

        // Build authentication context from verified JWT
        const authContext = buildAuthContext(jwtPayload, payload);

        // Check required scopes before proceeding
        const requiredScopes = metadata.requiredScopes || [];
        if (requiredScopes.length > 0) {
          const missing = this.checkScopes(requiredScopes, authContext.scopes);
          if (missing.length > 0) {
            res.status(403).json({
              error: 'Insufficient scopes',
              required_scopes: requiredScopes,
              missing_scopes: missing,
            });
            return;
          }
        }

        // Create client with runtime token
        const client = new KiketHttpClient(
          apiBaseUrl,
          this.config.workspaceToken,
          metadata.version,
          authContext.runtimeToken
        );

        const endpoints = new KiketEndpoints(client, this.config.extensionId, metadata.version);

        // Extract payload secrets for quick access (bundled by SecretResolver)
        const payloadSecrets = (payload?.secrets || {}) as Record<string, string>;

        // Build secret helper: checks payload secrets first (per-org), falls back to ENV (extension defaults)
        const secretHelper = this.buildSecretHelper(payloadSecrets);

        const context: HandlerContext = {
          event,
          eventVersion: metadata.version,
          headers: req.headers as Record<string, string>,
          client,
          endpoints,
          settings: this.config.settings,
          extensionId: this.config.extensionId,
          extensionVersion: this.config.extensionVersion,
          secrets: endpoints.secrets,
          secret: secretHelper,
          payloadSecrets,
          auth: authContext,
          requireScopes: this.buildScopeChecker(authContext.scopes),
        };

        // Execute handler with telemetry
        const startTime = process.hrtime.bigint();
        try {
          const result = await Promise.resolve(metadata.handler(payload, context));
          const endTime = process.hrtime.bigint();
          const durationMs = Number(endTime - startTime) / 1_000_000;

          await this.telemetry.record(event, metadata.version, 'ok', durationMs);

          res.json(result || { ok: true });
        } catch (error) {
          const endTime = process.hrtime.bigint();
          const durationMs = Number(endTime - startTime) / 1_000_000;

          await this.telemetry.record(event, metadata.version, 'error', durationMs, {
            errorMessage: error instanceof Error ? error.message : String(error),
            errorClass: error instanceof Error ? error.constructor.name : undefined,
          });

          throw error;
        } finally {
          await client.close();
        }
      } catch (error) {
        if (error instanceof KiketSDKError) {
          res.status(400).json({ error: error.message });
        } else if (error instanceof Error) {
          console.error('Handler error:', error);
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    };

    // Routes
    app.post('/webhooks/:event', dispatchHandler);
    app.post('/v/:version/webhooks/:event', dispatchHandler);

    // Health check
    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        extension_id: this.config.extensionId,
        extension_version: this.config.extensionVersion,
        registered_events: this.registry.eventNames(),
      });
    });

    // Error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: err.message });
    });

    return app;
  }

  private resolveConfig(config: SDKConfig, manifest: ExtensionManifest | null): ResolvedConfig {
    const resolvedBaseUrl = config.baseUrl || process.env.KIKET_BASE_URL || 'https://kiket.dev';
    const resolvedWorkspaceToken = config.workspaceToken || process.env.KIKET_WORKSPACE_TOKEN;

    // Merge settings
    let manifestSettings = settingsDefaults(manifest);
    if (manifest && config.autoEnvSecrets !== false) {
      manifestSettings = applySecretEnvOverrides(manifestSettings, secretKeys(manifest));
    }

    const mergedSettings = { ...manifestSettings, ...config.settings };

    const resolvedExtensionId = config.extensionId || manifest?.id;
    const resolvedExtensionVersion = config.extensionVersion || manifest?.version;

    const resolvedTelemetryUrl =
      config.telemetryUrl ||
      process.env.KIKET_SDK_TELEMETRY_URL ||
      `${resolvedBaseUrl}/api/v1/ext`;

    return {
      workspaceToken: resolvedWorkspaceToken,
      baseUrl: resolvedBaseUrl,
      settings: mergedSettings,
      extensionId: resolvedExtensionId,
      extensionVersion: resolvedExtensionVersion,
      telemetryEnabled: config.telemetryEnabled ?? true,
      feedbackHook: config.feedbackHook,
      telemetryUrl: resolvedTelemetryUrl,
    };
  }

  private coerceOptional(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  /**
   * Check if all required scopes are present.
   * @returns List of missing scopes (empty if all present)
   */
  private checkScopes(requiredScopes: string[], availableScopes: string[]): string[] {
    // Wildcard scope grants all permissions
    if (availableScopes.includes('*')) {
      return [];
    }
    return requiredScopes.filter(scope => !availableScopes.includes(scope));
  }

  /**
   * Build a scope checker function for use in handler context.
   */
  private buildScopeChecker(availableScopes: string[]): (...requiredScopes: string[]) => void {
    return (...requiredScopes: string[]) => {
      const missing = this.checkScopes(requiredScopes, availableScopes);
      if (missing.length > 0) {
        throw new ScopeError(requiredScopes, availableScopes);
      }
    };
  }

  /**
   * Build a secret helper function for use in handler context.
   * Checks payload secrets first (per-org configuration bundled by SecretResolver),
   * then falls back to environment variables (extension defaults).
   *
   * @param payloadSecrets Secrets from payload.secrets
   * @returns Function that resolves secrets by key
   *
   * @example
   * // In handler:
   * const slackToken = context.secret('SLACK_BOT_TOKEN');
   * // Returns payload.secrets['SLACK_BOT_TOKEN'] || process.env.SLACK_BOT_TOKEN
   */
  private buildSecretHelper(payloadSecrets: Record<string, string>): (key: string) => string | undefined {
    return (key: string): string | undefined => {
      // Payload secrets (per-org) take priority over ENV (extension defaults)
      return payloadSecrets[key] || process.env[key];
    };
  }
}

/**
 * Resolved configuration.
 */
interface ResolvedConfig {
  workspaceToken?: string;
  baseUrl: string;
  settings: Settings;
  extensionId?: string;
  extensionVersion?: string;
  telemetryEnabled: boolean;
  feedbackHook?: (record: TelemetryRecord) => Promise<void> | void;
  telemetryUrl?: string;
}

/**
 * Convenience helper to create an Express app without instantiating KiketSDK manually.
 */
export function createApp(config: SDKConfig = {}): Express {
  const sdk = new KiketSDK(config);
  return sdk.app;
}
