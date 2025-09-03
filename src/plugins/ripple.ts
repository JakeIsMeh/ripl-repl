import type { Plugin } from '@rollup/browser';
import { compile } from 'ripple/compiler';
import { promises as fs } from '@zenfs/core';
import path from 'pathe';

export function ripple(inlineOptions = {}): Partial<Plugin> {
	const api = {};

	const plugins = [
		{
			name: 'rollup-plugin-ripple',
			// make sure our resolver runs before vite internal resolver to resolve ripple field correctly
			enforce: 'pre',
			api,

			transform: {
				filter: { id: /\.ripple$/ },

				async handler(code, id, opts) {
					const { js, css } = await compile(code, id, id);

					if (css !== '') {
						const cssId = [`${id}?ripple`, 'type=style', 'lang.css'].join('&');
						// const cssId = `${id}-style.css`;
						await fs.mkdir(path.dirname(cssId), { recursive: true, })
						await fs.writeFile(cssId, css);

						js.code += `\nimport ${JSON.stringify(cssId)};\n`;
					}

					return js;
				},
			},
		}
	];

	return plugins;
}