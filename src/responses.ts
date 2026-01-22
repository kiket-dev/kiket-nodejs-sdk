/**
 * Response helpers for building properly formatted extension responses.
 *
 * These helpers ensure your extension returns data in the format Kiket expects,
 * including support for output_fields which are displayed in the configuration UI.
 */

/** Metadata that can be included in responses */
export interface ResponseMetadata {
  [key: string]: unknown;
  output_fields?: Record<string, string>;
}

/** Standard response format for extension handlers */
export interface ExtensionResponse {
  status: 'allow' | 'deny' | 'pending';
  message?: string;
  metadata: ResponseMetadata;
}

/** Options for building an allow response */
export interface AllowOptions {
  /** Optional success message */
  message?: string;
  /** Additional metadata to include */
  data?: Record<string, unknown>;
  /** Output fields to display in configuration UI */
  outputFields?: Record<string, string>;
}

/** Options for building deny/pending responses */
export interface ResponseOptions {
  /** Additional metadata to include */
  data?: Record<string, unknown>;
}

/**
 * Build an allow response with optional output fields.
 *
 * Output fields are displayed in the extension configuration UI after setup,
 * allowing extensions to expose generated data like email addresses, URLs,
 * or status information.
 *
 * @param options - Response options
 * @returns Properly formatted response for Kiket
 *
 * @example
 * ```typescript
 * allow({
 *   message: 'Successfully configured',
 *   data: { routeId: 123 },
 *   outputFields: { inbound_email: 'abc@parse.example.com' }
 * })
 * ```
 */
export function allow(options: AllowOptions = {}): ExtensionResponse {
  const { message, data = {}, outputFields } = options;
  const metadata: ResponseMetadata = { ...data };

  if (outputFields) {
    metadata.output_fields = outputFields;
  }

  const response: ExtensionResponse = {
    status: 'allow',
    metadata,
  };

  if (message !== undefined) {
    response.message = message;
  }

  return response;
}

/**
 * Build a deny response.
 *
 * @param message - Reason for denial
 * @param options - Additional response options
 * @returns Properly formatted response for Kiket
 *
 * @example
 * ```typescript
 * deny('Invalid credentials', { data: { errorCode: 'AUTH_FAILED' } })
 * ```
 */
export function deny(message: string, options: ResponseOptions = {}): ExtensionResponse {
  const { data = {} } = options;
  return {
    status: 'deny',
    message,
    metadata: data,
  };
}

/**
 * Build a pending response for async operations.
 *
 * @param message - Status message
 * @param options - Additional response options
 * @returns Properly formatted response for Kiket
 *
 * @example
 * ```typescript
 * pending('Awaiting approval', { data: { jobId: 'abc123' } })
 * ```
 */
export function pending(message: string, options: ResponseOptions = {}): ExtensionResponse {
  const { data = {} } = options;
  return {
    status: 'pending',
    message,
    metadata: data,
  };
}
