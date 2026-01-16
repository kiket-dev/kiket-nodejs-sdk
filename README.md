# Kiket Node.js SDK

> Build and run Kiket extensions with a batteries-included, strongly-typed TypeScript toolkit.

## Features

- 🔌 **Webhook decorators** – define handlers with `sdk.webhook("issue.created", "v1")`.
- 🔐 **Transparent authentication** – HMAC verification for inbound payloads, workspace-token client for outbound calls.
- 🔑 **Secret manager** – list, fetch, rotate, and delete extension secrets stored in Google Secret Manager.
- 📉 **Rate-limit helper** – introspect `/api/v1/ext/rate_limit` so long-running jobs can throttle themselves.
- 🌐 **Built-in Express app** – serve extension webhooks locally or in production without extra wiring.
- 🧪 **Testing utilities** – test helpers, signed-payload factories, and mock utilities to keep extensions reliable.
- 🔁 **Version-aware routing** – register multiple handlers per event (`sdk.webhook(..., "v2")`) and propagate version headers on outbound calls.
- 📦 **Manifest-aware defaults** – automatically loads `extension.yaml`/`manifest.yaml`, applies configuration defaults, and hydrates secrets from `KIKET_SECRET_*` environment variables.
- 📇 **Custom data helper** – call `/api/v1/ext/custom_data/...` with `context.endpoints.customData(projectId)` using the configured extension API key.
- 🧱 **Typed & documented** – designed for TypeScript with full type safety, strict mode, and rich JSDoc comments.
- 📊 **Telemetry & feedback hooks** – capture handler duration/success metrics automatically and forward them to your own feedback callback or a hosted endpoint.

## Quickstart

```bash
npm install @kiket-dev/sdk
```

```typescript
// main.ts
import { KiketSDK } from '@kiket-dev/sdk';

const sdk = new KiketSDK({
  webhookSecret: 'sh_123',
  workspaceToken: 'wk_test',
  extensionApiKey: process.env.KIKET_EXTENSION_API_KEY,
  extensionId: 'com.example.marketing',
  extensionVersion: '1.0.0',
});

// Register webhook handler (v1)
sdk.webhook('issue.created', 'v1')((payload, context) => {
  const summary = payload.issue.title;
  console.log(`Event version: ${context.eventVersion}`);

  await context.endpoints.logEvent('issue.created', { summary });
  await context.secrets.set('WEBHOOK_TOKEN', 'abc123');

  return { ok: true };
});

// Register webhook handler (v2)
sdk.webhook('issue.created', 'v2')(async (payload, context) => {
  const summary = payload.issue.title;

  await context.endpoints.logEvent('issue.created', {
    summary,
    schema: 'v2'
  });

  return { ok: true, version: context.eventVersion };
});

// The SDK will auto-bootstrap settings from extension.yaml/manifest.yaml (if present),
// read secrets from env vars like KIKET_SECRET_EXAMPLE_APIKEY, and fall back to
// KIKET_WORKSPACE_TOKEN / KIKET_WEBHOOK_SECRET environment variables when explicit
// values are not supplied. Kiket sends the event version in the request path
// (/v/{version}/webhooks/{event}) or via the `X-Kiket-Event-Version` header.

sdk.run('0.0.0.0', 8080);
```

### Custom Data Client

When your manifest declares `custom_data.permissions`, set `extensionApiKey` (or `KIKET_EXTENSION_API_KEY`) so outbound calls to `/api/v1/ext/...` automatically include the required header:

```typescript
sdk.webhook('issue.created', 'v1')(async (payload, context) => {
  const projectId = payload.issue.project_id;

  const contacts = await context.endpoints.customData(projectId).list(
    'com.example.crm.contacts',
    'automation_records',
    { limit: 10, filters: { status: 'active' } }
  );

  await context.endpoints.customData(projectId).create(
    'com.example.crm.contacts',
    'automation_records',
    { email: 'lead@example.com', metadata: { source: 'webhook' } }
  );

  return { synced: contacts.data.length };
});
```

### SLA Alert Stream

Listen for `workflow.sla_status` webhooks and enrich the alert with the REST helper:

```typescript
sdk.webhook('workflow.sla_status', 'v1')(async (payload, context) => {
  const projectId = payload.issue.project_id;

  const events = await context.endpoints.slaEvents(projectId).list({
    state: 'imminent',
    limit: 5,
  });

  if (!events.data.length) {
    return { ok: true };
  }

  const first = events.data[0];
  await context.endpoints.notify(
    'SLA warning',
    `Issue #${first.issue_id} is ${first.state} for ${first.definition?.status}`,
    'warning'
  );

  return { acknowledged: true };
});
```

### Rate-Limit Helper

Check the current extension window before enqueueing expensive jobs:

```typescript
sdk.webhook('automation.triggered', 'v1')(async (_payload, context) => {
  const limits = await context.endpoints.rateLimit();

  if (limits.remaining < 10) {
    await context.endpoints.logEvent('rate_limited', {
      remaining: limits.remaining,
      windowSeconds: limits.windowSeconds,
    });
    return { deferred: true, resetIn: limits.resetIn };
  }

  // Safe to continue
  return { processed: true };
});
```

## Telemetry & Feedback Hooks

Every handler invocation emits an opt-in telemetry record containing the event name, version, duration, and status (`ok` / `error`). Enable or customise reporting when instantiating the SDK:

```typescript
import { KiketSDK, TelemetryRecord } from '@kiket-dev/sdk';

async function feedback(record: TelemetryRecord): Promise<void> {
  console.log(
    `[telemetry] ${record.event}@${record.version} -> ${record.status} (${record.durationMs.toFixed(2)}ms)`
  );
}

const sdk = new KiketSDK({
  webhookSecret: 'secret',
  workspaceToken: 'wk_test',
  telemetryEnabled: true,
  feedbackHook: feedback,
  telemetryUrl: process.env.KIKET_SDK_TELEMETRY_URL, // optional hosted endpoint
});
```

Set `KIKET_SDK_TELEMETRY_OPTOUT=1` to disable reporting entirely. When `telemetryUrl` is provided (or the environment variable is set), the SDK will POST telemetry JSON to that endpoint with best-effort retry; failures are logged and never crash handlers.

## Delivery Payload Reference

Webhook payloads include runtime tokens, injected secrets, and API metadata. Review the [extension delivery contract](https://docs.kiket.dev/extensions/delivery-contract/) for the complete schema and response rules, then mirror the structure in your handlers for reliable diagnostics.

## Testing

The SDK includes comprehensive test utilities:

```typescript
import { createSignedPayload, createTestContext } from '@kiket-dev/sdk/test';

describe('My webhook handler', () => {
  it('should handle issue.created event', async () => {
    const sdk = new KiketSDK({ webhookSecret: 'test-secret' });

    const handler = sdk.webhook('issue.created', 'v1')((payload, context) => {
      return { processed: payload.issue.id };
    });

    // Create signed payload for testing
    const { body, headers } = createSignedPayload('test-secret', {
      issue: { id: '123', title: 'Test Issue' }
    });

    // Test the handler
    const response = await request(sdk.app)
      .post('/v/1/webhooks/issue.created')
      .set(headers)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe('123');
  });
});
```

## Configuration

### Environment Variables

The SDK automatically reads from these environment variables:

- `KIKET_WEBHOOK_SECRET` – Webhook HMAC secret for signature verification
- `KIKET_WORKSPACE_TOKEN` – Workspace token for API authentication
- `KIKET_EXTENSION_API_KEY` – Extension API key for `/api/v1/ext/**` endpoints (custom data client)
- `KIKET_BASE_URL` – Kiket API base URL (defaults to `https://kiket.dev`)
- `KIKET_SDK_TELEMETRY_URL` – Telemetry reporting endpoint (optional)
- `KIKET_SDK_TELEMETRY_OPTOUT` – Set to `1` to disable telemetry
- `KIKET_SECRET_*` – Secret overrides (e.g., `KIKET_SECRET_API_KEY`)

### Manifest File

Create an `extension.yaml` or `manifest.yaml` file in your project root:

```yaml
id: com.example.marketing
version: 1.0.0
delivery_secret: sh_production_secret

settings:
  - key: API_KEY
    secret: true
  - key: MAX_RETRIES
    default: 3
  - key: TIMEOUT_MS
    default: 5000
```

The SDK will automatically load this manifest and:
- Use `delivery_secret` as the webhook secret
- Apply default values for settings
- Load secrets from `KIKET_SECRET_*` environment variables

## API Reference

### KiketSDK

Main SDK class for building extensions.

```typescript
const sdk = new KiketSDK({
  webhookSecret?: string;
  workspaceToken?: string;
  baseUrl?: string;
  settings?: Record<string, unknown>;
  extensionId?: string;
  extensionVersion?: string;
  manifestPath?: string;
  autoEnvSecrets?: boolean;
  telemetryEnabled?: boolean;
  feedbackHook?: (record: TelemetryRecord) => Promise<void> | void;
  telemetryUrl?: string;
});
```

**Methods:**

- `sdk.register(event: string, handler: WebhookHandler, version: string)` – Register a webhook handler
- `sdk.webhook(event: string, version: string)` – Decorator for registering handlers
- `sdk.load(module: Record<string, unknown>)` – Load all handlers from a module
- `sdk.run(host?: string, port?: number)` – Start the Express server

### HandlerContext

Context passed to webhook handlers:

```typescript
interface HandlerContext {
  event: string;                          // Event name
  eventVersion: string;                   // Event version
  headers: Readonly<Record<string, string>>; // Request headers
  client: KiketClient;                    // API client
  endpoints: ExtensionEndpoints;          // High-level endpoints
  settings: Readonly<Record<string, unknown>>; // Extension settings
  extensionId?: string;                   // Extension identifier
  extensionVersion?: string;              // Extension version
  secrets: ExtensionSecretManager;        // Secret manager
  secret(key: string): string | undefined; // Secret helper with payload-first fallback
  auth: {
    runtimeToken?: string;                // Per-invocation API token
    tokenType?: string;                   // Typically "runtime"
    expiresAt?: string;                   // Token expiration timestamp
    scopes: string[];                     // Granted API scopes
  };
}
```

### Secret Helper

The `secret()` method provides a simple way to retrieve secrets with automatic fallback:

```typescript
// Checks payload secrets first (per-org config), falls back to ENV
const slackToken = context.secret('SLACK_BOT_TOKEN');

// Example usage
sdk.webhook('issue.created', 'v1')(async (payload, context) => {
  const apiKey = context.secret('API_KEY');
  if (!apiKey) {
    throw new Error('API_KEY not configured');
  }
  // Use apiKey...
  return { ok: true };
});
```

The lookup order is:
1. **Payload secrets** (per-org configuration from `payload["secrets"]`)
2. **Environment variables** (extension defaults via `process.env`)

This allows organizations to override extension defaults with their own credentials.

### Runtime Token Authentication

The Kiket platform sends a per-invocation `runtime_token` in each webhook payload. This token is automatically extracted and used for all API calls made through `context.client` and `context.endpoints`. The runtime token provides organization-scoped access and is preferred over static tokens.

```typescript
sdk.webhook('issue.created', 'v1')(async (payload, context) => {
  // Access authentication context
  console.log(`Token expires at: ${context.auth.expiresAt}`);
  console.log(`Scopes: ${context.auth.scopes.join(', ')}`);

  // API calls automatically use the runtime token
  await context.endpoints.logEvent('processed', { ok: true });

  return { ok: true };
});
```

### Scope Checking

Extensions can declare required scopes when registering handlers. The SDK will automatically check scopes before invoking the handler and return a 403 error if insufficient.

```typescript
// Declare required scopes at registration time
sdk.register('issue.created', handler, 'v1', ['issues.read', 'issues.write']);

// Or using the decorator
sdk.webhook('issue.created', 'v1', ['issues.read', 'issues.write'])(async (payload, context) => {
  // Handler only executes if scopes are present
  await context.endpoints.logEvent('issue.processed', { id: payload.issue.id });
  return { ok: true };
});

// Check scopes dynamically within the handler
sdk.webhook('workflow.triggered', 'v1')(async (payload, context) => {
  // Throws ScopeError if scopes are missing
  context.requireScopes('workflows.execute', 'custom_data.write');

  // Continue with scope-protected operations
  await context.endpoints.customData(projectId).create(...);
  return { ok: true };
});
```

### ExtensionEndpoints

High-level extension endpoints:

```typescript
interface ExtensionEndpoints {
  secrets: ExtensionSecretManager;
  logEvent(event: string, data: Record<string, unknown>): Promise<void>;
  getMetadata(): Promise<unknown>;
}
```

### ExtensionSecretManager

Secret manager for CRUD operations:

```typescript
interface ExtensionSecretManager {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  rotate(key: string, newValue: string): Promise<void>;
}
```

## Publishing to GitHub Packages

When you are ready to cut a release:

1. Update the version in `package.json`.
2. Run the test suite (`npm test`) and linting (`npm run lint`).
3. Build distributables:
   ```bash
   npm run build
   ```
4. Commit and tag the release:
   ```bash
   git add package.json
   git commit -m "Bump Node.js SDK to v0.x.y"
   git tag nodejs-v0.x.y
   git push --tags
   ```
5. GitHub Actions will automatically publish to GitHub Packages.

## Roadmap

- **MVP (done):** webhook decorators, Express runtime, auth verification, outbound client, testing toolkit.
- **Enhancements:** high-level endpoints (`context.endpoints.*`), richer secret tooling (rotation helpers, runtime vault adapters), typed payload utilities.
- **Sample extension:** ship a production-grade marketing automation example demonstrating multi-event handlers, manifest-driven configuration, and deployment templates.
- **Documentation:** publish quickstart, reference, cookbook, and tutorial content alongside SDK release.
- **Early access:** package for npm, collect telemetry/feedback before general availability (telemetry hooks + publishing checklist now available).

## License

MIT
