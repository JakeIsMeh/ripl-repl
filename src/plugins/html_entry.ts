/**
 * Custom html entry plugin for rollup bc rollup-plugin-html is fake ESM ://
 */

import { promises as fs } from '@zenfs/core';
import path from 'pathe';
import {type Plugin} from '@rollup/browser';

/**
 * A Rollup plugin to use an HTML file as the input.
 * It finds script tags in the HTML and uses them as Rollup inputs.
 *
 * @returns {import('rollup').Plugin} The plugin object.
 */
export default function htmlEntry(): Plugin  {
  return {
    name: 'html-entry',

    /**
     * This hook is called by Rollup to resolve the input options.
     * We use it to intercept an HTML file input.
     * @param {import('rollup').InputOptions} inputOptions
     */
    async options(inputOptions) {
      const input = inputOptions.input;

      // Ensure input is a string and ends with .html
      if (typeof input !== 'string' || !input.endsWith('.html')) {
        return null;
      }

      const htmlFilePath = path.resolve(input);
      let htmlContent;
      try {
        htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
      } catch (error) {
        this.error(`Could not read HTML entry file: ${htmlFilePath}`);
      }

      // Simple regex to find <script src="..."></script> tags.
      // This is a basic implementation and might not cover all edge cases.
      const scriptSrcRegex = /<script\s+[^>]*src="([^"]*)"[^>]*><\/script>/gi;
      const scriptEntries = [];
      let match;

      while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
        // Resolve script path relative to the HTML file's directory
        const scriptPath = path.resolve(path.dirname(htmlFilePath), match[1]);
        scriptEntries.push(scriptPath);
      }

      if (scriptEntries.length === 0) {
        this.warn(`No <script src="..."> tags found in ${input}. Rollup will have no input.`);
        return { ...inputOptions, input: [] };
      }

      // Create a new input object for Rollup, mapping original script names to their resolved paths
      const newInputs = {};
      scriptEntries.forEach(entry => {
        const name = path.basename(entry, path.extname(entry));
        newInputs[name] = entry;
      });

      console.log(`Found script entries in ${input}:`, newInputs);

      // Replace the original HTML input with the found script files
      return { ...inputOptions, input: newInputs };
    },

    /**
     * This hook is called when the bundle is generated.
     * We'll create a final HTML file in the output directory.
     * @param {import('rollup').OutputOptions} outputOptions
     * @param {import('rollup').OutputBundle} bundle
     */
    async generateBundle(outputOptions, bundle) {
        // Since we changed the input, we need to find the original HTML file again.
        // This is a simplification; a more robust plugin would store the original input path.
        // For this example, we assume we know the original entry was 'index.html'.
        // A better approach would be to store it in the `options` hook context.
        const originalInput = this.meta.rollupVersion ? // A way to check context availability
            (this.getModuleInfo((this.getModuleIds().next().value)).importers[0] || 'index.html')
            : 'index.html';

        if (!originalInput.endsWith('.html')) {
            return;
        }

        const htmlFilePath = path.resolve(originalInput);
        let htmlContent;
        try {
            htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
        } catch (error) {
            this.error(`Could not read original HTML file for bundling: ${htmlFilePath}`);
            return;
        }

        // Replace original script tags with references to the bundled files
        for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'chunk' && chunk.isEntry) {
                // Find the original script source that corresponds to this chunk
                // The chunk.facadeModuleId is the absolute path to the original source file.
                const originalScriptPath = chunk.facadeModuleId;
                if(originalScriptPath) {
                    const relativeOriginal = path.relative(path.dirname(htmlFilePath), originalScriptPath);
                    // Replace the original script path with the final bundled file path.
                    // The replacement path should be relative to the output HTML.
                    htmlContent = htmlContent.replace(
                        new RegExp(`src=["']?${relativeOriginal}["']?`),
                        `src="${chunk.fileName}"`
                    );
                }
            }
        }

        // Emit the final HTML file into the bundle
        this.emitFile({
            type: 'asset',
            fileName: path.basename(htmlFilePath),
            source: htmlContent,
        });
    },
  };
}
