
import 'virtual:uno.css'
import { rollup } from '@rollup/browser';
import { configureSingle, promises as fs, InMemory } from '@zenfs/core';
import path from 'pathe';
import { ripple } from './plugins/ripple';
import cssImport from './plugins/css_imports';
import sucrase from '@rollup/plugin-sucrase';
import cdnImport from './plugins/cdn_import';

/**
 * FS Setup
 */

await configureSingle({ backend: InMemory });

const files = import.meta.glob(['./template/**', '!./template/index.html'], { query: '?raw', import: 'default' })

// write files synchronously due to async io issues
for (const full_path in files) {
	if (Object.prototype.hasOwnProperty.call(files, full_path)) {
		const file = await files[full_path]();
		const trunc_path = full_path.replace('./template/', '')
		await fs.mkdir(path.dirname(trunc_path), { recursive: true, })
		// @ts-ignore
		await fs.writeFile('./' + trunc_path, file)
	}
}

/**
 * Bundling
 */
const bundle = await rollup({
	input: 'main.ts',
	// @ts-ignore
	fs: fs,
	plugins: [
		// @ts-ignore
		ripple(),
		// @ts-ignore
		cssImport(),
		cdnImport(),
		sucrase({ transforms: ['typescript'], })
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

const sb_ele = document.getElementById('sandbox')
sb_ele?.setAttribute('src', URL.createObjectURL(new Blob([processed_html], {type: 'text/html'})))
