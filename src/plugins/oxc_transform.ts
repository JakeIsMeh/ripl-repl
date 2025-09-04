import type { Plugin } from "@rollup/browser";
import { createFilter } from '@rollup/pluginutils';
import { transform } from 'oxc-transform';

export default function oxc(): Plugin {
	const filter = createFilter(['**.?(c|m)[jt]s?(x)'])
	return {
		name: 'rollup-plugin-ripple',
		async transform(code, id) {
			if (!filter(id)) return;

			const result = transform(id, code, {
				sourceType: 'module',
				sourcemap: true,
				typescript: {
					rewriteImportExtensions: 'rewrite',
				}
			});

			if (result.errors.length) {
				console.log(result.errors[0].codeframe)
				throw result.errors[0];
			}

			return {
				code: result.code,
				map: result.map,
				meta: {
					pre_import: result.code
				}
			}
		}
	}
}