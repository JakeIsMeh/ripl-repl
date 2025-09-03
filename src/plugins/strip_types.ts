import { transform } from 'oxc-transform';
import path from 'pathe';
import type { Plugin } from '@rollup/browser';

/**
 * A Rollup plugin to strip TypeScript types using the Oxc transformer.
 * @returns {import('rollup').Plugin} The Rollup plugin object.
 */
export default function oxcStripTypes(): Partial<Plugin> {
  return {
    name: 'oxc-strip-types',

    async transform(code, id) {
      // 1. Filter for .ts and .tsx files
      const fileExtension = path.extname(id);
      if (!['.ts', '.tsx'].includes(fileExtension)) {
        return null; // Return null to let other plugins handle non-TS files
      }

      try {
        // 2. Perform the transformation using oxc-transform
        const result = transform(id, code, {
          sourcemap: true,
          typescript: {
            rewriteImportExtensions: 'rewrite',
            onlyRemoveTypeImports: true
          }
        });

        // 3. Return the transformed code and its sourcemap to Rollup
        return {
          code: result.code,
          map: result.map,
        };
      } catch (error) {
        // Forward errors to Rollup for better build failure reporting
        this.error(`[oxc-strip-types] Error transforming ${id}: ${error.message}`);
      }
    },
  };
}
