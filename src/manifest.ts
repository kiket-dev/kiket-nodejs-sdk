/**
 * Extension manifest loader and parser.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ExtensionManifest, Settings } from './types';

/**
 * Load extension manifest from file.
 *
 * @param manifestPath - Path to manifest file (optional)
 * @returns Parsed manifest or null if not found
 */
export function loadManifest(manifestPath?: string): ExtensionManifest | null {
  const paths = manifestPath
    ? [manifestPath]
    : ['extension.yaml', 'manifest.yaml', 'extension.yml', 'manifest.yml'];

  for (const p of paths) {
    const fullPath = path.resolve(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = yaml.parse(content) as ExtensionManifest;
        return parsed;
      } catch (error) {
        console.warn(`Failed to parse manifest at ${fullPath}:`, error);
      }
    }
  }

  return null;
}

/**
 * Extract settings defaults from manifest.
 *
 * @param manifest - Extension manifest
 * @returns Settings with default values
 */
export function settingsDefaults(manifest: ExtensionManifest | null): Settings {
  if (!manifest?.settings) {
    return {};
  }

  const defaults: Settings = {};
  for (const setting of manifest.settings) {
    if (setting.default !== undefined) {
      defaults[setting.key] = setting.default;
    }
  }

  return defaults;
}

/**
 * Extract secret keys from manifest.
 *
 * @param manifest - Extension manifest
 * @returns Array of secret keys
 */
export function secretKeys(manifest: ExtensionManifest | null): string[] {
  if (!manifest?.settings) {
    return [];
  }

  return manifest.settings.filter((s) => s.secret === true).map((s) => s.key);
}

/**
 * Apply environment variable overrides to settings.
 * Looks for KIKET_SECRET_* environment variables.
 *
 * @param settings - Current settings
 * @param secrets - Array of secret keys from manifest
 * @returns Updated settings with env overrides
 */
export function applySecretEnvOverrides(settings: Settings, secrets: string[]): Settings {
  const updated = { ...settings };

  for (const key of secrets) {
    const envKey = `KIKET_SECRET_${key.toUpperCase()}`;
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
      updated[key] = envValue;
    }
  }

  return updated;
}
