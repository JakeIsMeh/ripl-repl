import type { Plugin } from '@rollup/browser';
import { promises as fs } from '@zenfs/core';

/**
 * A Rollup plugin to import CSS files.
 * @returns {import('rollup').Plugin} The plugin object.
 */
export default function cssImport(): Plugin {
  return {
    name: 'css-import',
    /**
     * This hook intercepts imports.
     * @param {string} id The id of the module to load.
     */
    async load(id) {
      let url;
      try {
        url = new URL(id);
      } catch (_) {
      }
      // We only care about files ending with .css
      if (!id.endsWith('.css') && !url?.pathname.endsWith('.css')) {
        return null;
      }

      try {
        // Read the content of the CSS file.
        let cssContent;
        if (!url) {
          cssContent = await fs.readFile(id, 'utf-8');
        } else {
          cssContent = await (await fetch(url)).text()
        }

        // Escape backticks, backslashes, and newlines to safely use it in a template literal.
        const escapedCss = cssContent
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\n/g, '\\n');

        // Create the JavaScript code that will inject the CSS into the DOM.
        const code = `
(function() {
  const css = \`${escapedCss}\`;
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
})();
        `;
        return {
          code: code,
          map: { mappings: '' } // We don't need a source map for this.
        };
      } catch (error) {
        console.error(`Error loading CSS file: ${id}`, error);
        this.error(`Could not load CSS file ${id}`);
        return null;
      }
    }
  };
}
