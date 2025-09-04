/**
 * Taken from preact-www
 */

import type { Plugin } from "@rollup/browser";
import fs from "@zenfs/core";

export default function cdnImport(): Plugin {
	return {
		name: 'repl',
		resolveId(id, importer) {
			// Handle local source files
			if (fs.existsSync(id)) return id;

			// Resolve absolute path ids relative to their importer. For example,
			// esm.sh will return this internally. `https://esm.sh/preact` returns
			// `exports * from "/stable/preact@10.18.0/es2022/preact.mjs"`

			if (id[0] === '/') {
				if (!importer!.match(/^https?:/)) {
					throw new Error(`Cannot resolve ${id} from ${importer}`);
				}

				try {
					return new URL(id, importer).href;
				} catch (e) { }
			}

			// If id is already an esm.sh url, add `?external=*` to it and return
			if (id.includes('://esm.sh/')) {
				const url = new URL(id);
				url.searchParams.set('external', '*');
				return url.href;
			}

			// Leave initial import, relative imports, & other http imports alone
			if (!importer || /(^\.\/|:\/\/)/.test(id)) {
				return id;
			}

			// For everything else (i.e. bare module specifiers), resolve to a
			// package on esm.sh. We'll support any syntax & options that esm.sh
			// supports
			const url = new URL(id, 'https://esm.sh/');
			url.searchParams.set('external', '*');
			return url.href;
		},
		async load(id) {
			if (fs.existsSync(id)) {
				return null
			}
			return get(id)
		}
	}
}

// helper: cached http get text
const cache = new Map();
function get(url) {
	url = new URL(url).href;
	if (cache.has(url)) return cache.get(url);
	const p = fetch(url).then(r => (cache.set(r.url, p), r.text()));
	cache.set(url, p);
	return p;
}