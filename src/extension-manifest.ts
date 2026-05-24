/**
 * Platform evidence adapter manifest (`kiket-extension.yaml`) validation.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { z } from 'zod';

export const extensionManifestSchema = z.object({
  apiVersion: z.literal('kiket.dev/v1'),
  kind: z.literal('Extension'),
  metadata: z.object({
    key: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(255),
    version: z.string().min(1).max(80),
    description: z.string().max(2000).optional(),
  }),
  spec: z.object({
    sourceSystem: z.string().min(1).max(100),
    ingestionScopes: z
      .array(z.enum(['raw-events:write', 'evidence:write']))
      .min(1)
      .default(['raw-events:write', 'evidence:write']),
    sourceEventTypes: z.array(z.string().min(1).max(150)).default([]),
    evidenceTypes: z.array(z.string().min(1).max(100)).default([]),
    retentionHints: z
      .object({
        rawDays: z.number().int().positive().optional(),
        evidenceDays: z.number().int().positive().optional(),
      })
      .default({}),
  }),
});

export type ExtensionAdapterManifest = z.infer<typeof extensionManifestSchema>;

export function parseExtensionManifest(content: unknown): ExtensionAdapterManifest {
  return extensionManifestSchema.parse(content);
}

export function validateExtensionManifestYaml(yamlText: string): {
  valid: boolean;
  manifest?: ExtensionAdapterManifest;
  errors: string[];
} {
  try {
    const parsed = yaml.parse(yamlText);
    const manifest = parseExtensionManifest(parsed);
    return { valid: true, manifest, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }
    return { valid: false, errors: [error instanceof Error ? error.message : 'Invalid kiket-extension.yaml'] };
  }
}

export const KIKET_EXTENSION_MANIFEST_FILENAME = 'kiket-extension.yaml';

export function loadExtensionManifest(manifestPath?: string): ExtensionAdapterManifest | null {
  const paths = manifestPath ? [manifestPath] : [KIKET_EXTENSION_MANIFEST_FILENAME];

  for (const candidate of paths) {
    const fullPath = path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const result = validateExtensionManifestYaml(content);
    if (result.valid && result.manifest) return result.manifest;
  }
  return null;
}

export const STARTER_EXTENSION_MANIFEST = `apiVersion: kiket.dev/v1
kind: Extension
metadata:
  key: my-evidence-adapter
  name: My Evidence Adapter
  version: 0.1.0
  description: Normalize external events into Kiket raw events and evidence.
spec:
  sourceSystem: webhook
  ingestionScopes:
    - raw-events:write
    - evidence:write
  sourceEventTypes:
    - inbound
  evidenceTypes:
    - approval
  retentionHints:
    rawDays: 30
    evidenceDays: 365
`;
