import { rollup } from '@rollup/browser';
import { configureSingle, promises as fs, InMemory } from '@zenfs/core';
import path from 'pathe';
import { ripple } from './plugins/ripple';
import cssImport from './plugins/css_imports';
import sucrase from '@rollup/plugin-sucrase';
import cdnImport from './plugins/cdn_import';
// import oxc from './plugins/oxc_transform';

import * as Comlink from 'comlink'; // TODO: tree shake this

// Map<string, string>
async function bundle(files_string: string) {
	const start_time = performance.now()
	console.log("hi hi")
	const files: Map<string, string> = JSON.parse(files_string, map_reviver);

	/**
	 * FS Setup
	 */
	await configureSingle({ backend: InMemory });

	// TODO: is this redundant?
	for (const [filename, content] of files) {
		await fs.mkdir(path.dirname(filename), { recursive: true, });
		await fs.writeFile(filename, content);
	}


	/**
	 * Bundling
	 */
	const bundle = await rollup({
		input: 'main.ts',
		// @ts-ignore
		fs: fs,
		treeshake: false, // TODO: should this be true?
		plugins: [
			ripple(),
			cssImport(),
			cdnImport(),
			sucrase({
				disableESTransforms: true,
				transforms: ['typescript'],
			}),
			// oxc(),
		],
	});

	const result = (await bundle.generate({ format: 'es' })).output[0];

	const index_html = await (
		await import.meta.glob('./template/index.html', {
			query: '?raw', import: 'default'
		})
	)['./template/index.html']() as string

	const processed_html = index_html
		.replace('<!-- __script__ -->', `<script type="module">${result.code}</script>`)
	
	const end_time = performance.now()
	console.log(`Bundling took ${end_time - start_time}ms`)

	return processed_html;
}

function map_reviver(key, value) {
  if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

Comlink.expose(bundle)
