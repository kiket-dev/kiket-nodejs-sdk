/**
 * Generic webhook field mapping schema for evidence adapters.
 */
import { z } from 'zod';

export const WebhookFieldMappingSchema = z.object({
  caseId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  sourceObjectId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  evidenceType: z.string().min(1).optional(),
  occurredAt: z.string().min(1).optional(),
  approved: z.string().min(1).optional(),
});

export const WebhookMappingConfigSchema = z.object({
  defaultEventType: z.string().min(1).default('evidence.observed'),
  defaultEvidenceType: z.string().min(1).default('webhook'),
  fields: WebhookFieldMappingSchema.default({}),
});

export type WebhookFieldMapping = z.infer<typeof WebhookFieldMappingSchema>;
export type WebhookMappingConfig = z.infer<typeof WebhookMappingConfigSchema>;

export function parseWebhookMappingConfig(value: unknown): WebhookMappingConfig {
  return WebhookMappingConfigSchema.parse(value);
}

export const STARTER_WEBHOOK_MAPPING = {
  defaultEventType: 'approval.recorded',
  defaultEvidenceType: 'approval',
  fields: {
    caseId: 'case_id',
    sourceObjectId: 'object_id',
    title: 'title',
    approved: 'approved',
    occurredAt: 'occurred_at',
  },
} satisfies WebhookMappingConfig;
