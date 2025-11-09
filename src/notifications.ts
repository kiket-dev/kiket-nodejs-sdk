/**
 * Notification types for extension development.
 */

/**
 * Standard notification request for extension delivery.
 */
export interface NotificationRequest {
  /** The notification message content */
  message: string;

  /** Type of channel ("channel", "dm", "group") */
  channelType: 'channel' | 'dm' | 'group';

  /** ID of the channel (for channelType="channel") */
  channelId?: string;

  /** ID of the recipient (for channelType="dm") */
  recipientId?: string;

  /** Message format ("plain", "markdown", "html") */
  format?: 'plain' | 'markdown' | 'html';

  /** Notification priority ("low", "normal", "high", "urgent") */
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  /** Additional metadata for the notification */
  metadata?: Record<string, unknown>;

  /** Optional thread ID for threaded messages */
  threadId?: string;

  /** Optional list of attachments */
  attachments?: Array<Record<string, unknown>>;
}

/**
 * Standard notification response from extension.
 */
export interface NotificationResponse {
  /** Whether the notification was delivered successfully */
  success: boolean;

  /** ID of the delivered message */
  messageId?: string;

  /** Timestamp when message was delivered */
  deliveredAt?: Date | string;

  /** Error message if delivery failed */
  error?: string;

  /** Seconds to wait before retrying (for rate limits) */
  retryAfter?: number;
}

/**
 * Request to validate a notification channel.
 */
export interface ChannelValidationRequest {
  /** ID of the channel to validate */
  channelId: string;

  /** Type of channel ("channel", "dm", "group") */
  channelType?: 'channel' | 'dm' | 'group';
}

/**
 * Response from channel validation.
 */
export interface ChannelValidationResponse {
  /** Whether the channel is valid and accessible */
  valid: boolean;

  /** Error message if validation failed */
  error?: string;

  /** Additional channel metadata (name, member count, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Validates a notification request.
 * @param request The notification request to validate
 * @throws Error if validation fails
 */
export function validateNotificationRequest(request: NotificationRequest): void {
  if (!request.message) {
    throw new Error('Message content is required');
  }

  if (!['channel', 'dm', 'group'].includes(request.channelType)) {
    throw new Error(`Invalid channelType: ${request.channelType}`);
  }

  if (request.channelType === 'dm' && !request.recipientId) {
    throw new Error('recipientId is required for channelType="dm"');
  }

  if (request.channelType === 'channel' && !request.channelId) {
    throw new Error('channelId is required for channelType="channel"');
  }

  if (request.format && !['plain', 'markdown', 'html'].includes(request.format)) {
    throw new Error(`Invalid format: ${request.format}`);
  }

  if (request.priority && !['low', 'normal', 'high', 'urgent'].includes(request.priority)) {
    throw new Error(`Invalid priority: ${request.priority}`);
  }
}
