
import 'virtual:uno.css'
import { rollup } from '@rollup/browser';
import { configureSingle, promises as fs, InMemory } from '@zenfs/core';
import path from 'pathe';
import htmlEntry from './plugins/html_entry';
import { ripple } from './plugins/ripple';
import cssImport from './plugins/css_imports';
import stripTypescript from './plugins/strip_types';

await configureSingle({ backend: InMemory });

const files = import.meta.glob('./template/**', { query: '?raw', import: 'default' })

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

console.log(await fs.readdir('/', {recursive: true}))



rollup({
	input: 'index.html',
	// @ts-ignore
	fs: fs,
	plugins: [
		// @ts-ignore
		ripple(),
		htmlEntry(),
		// @ts-ignore
		cssImport(),
		// @ts-ignore
		stripTypescript(),
	],
})
	.then(bundle => bundle.generate({ format: 'es' }))
	.then(({ output }) => console.log(output));
