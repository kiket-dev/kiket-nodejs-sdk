/**
 * Tests for extension adapter manifest validation.
 */
import {
  parseExtensionManifest,
  STARTER_EXTENSION_MANIFEST,
  validateExtensionManifestYaml,
} from '../extension-manifest';

describe('extension-manifest', () => {
  it('validates a starter manifest', () => {
    const result = validateExtensionManifestYaml(STARTER_EXTENSION_MANIFEST);
    expect(result.valid).toBe(true);
    expect(result.manifest?.metadata.key).toBe('my-evidence-adapter');
    expect(result.manifest?.spec.ingestionScopes).toContain('raw-events:write');
  });

  it('rejects missing metadata.key', () => {
    const result = validateExtensionManifestYaml(`apiVersion: kiket.dev/v1
kind: Extension
metadata:
  name: Broken
  version: 0.1.0
spec:
  sourceSystem: webhook
`);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('metadata.key');
  });

  it('parses a valid manifest object', () => {
    const manifest = parseExtensionManifest({
      apiVersion: 'kiket.dev/v1',
      kind: 'Extension',
      metadata: { key: 'github', name: 'GitHub', version: '1.0.0' },
      spec: { sourceSystem: 'github' },
    });
    expect(manifest.spec.sourceSystem).toBe('github');
    expect(manifest.spec.ingestionScopes).toEqual(['raw-events:write', 'evidence:write']);
  });
});
