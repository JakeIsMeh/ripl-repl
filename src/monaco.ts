import { init, Workspace } from "modern-monaco";
import { type FileStat } from "modern-monaco/workspace";
import path from 'pathe'
import { debounce } from "perfect-debounce";

// VITE-ONLY, we use it so we can write the worker using ESM :P
import bundleWorker from './bundler.worker?worker';

import * as Comlink from 'comlink'; // TODO: tree shake this

const DEBOUNCE_MS = 300

// default files
const default_files_lazy = import.meta.glob(['./template/**', '!./template/index.html'], { query: '?raw', import: 'default' });
const default_files: Record<string, string> = {}; // we use a record bc it's what modern-monaco accepts
for (const full_path in default_files_lazy) {
	if (Object.prototype.hasOwnProperty.call(default_files_lazy, full_path)) {
		const file = await default_files_lazy[full_path]() as string;
		const trunc_path = full_path.replace('./template/', '');
		default_files[trunc_path] = file;
	}
}

export async function init_monaco() {
	const workspace = new Workspace({
		/** The name of the workspace, used for project isolation. Default is "default". */
		name: "ripple-playground",
		/** Initial files in the workspace. */
		initialFiles: default_files,
		/** File to open when the editor is loaded for the first time. */
		// entryFile: "App.ripple", // doesn't work??
	});

	// load monaco-editor-core.js
	const monaco = await init({
		workspace,
		langs: [
			// `https://cdn.jsdelivr.net/gh/trueadm/ripple@refs/heads/main/packages/ripple-vscode-plugin/syntaxes/ripple.tmLanguage.json`,
			"html",
			"css",
			"javascript",
			"json",
		]
	});

	// create a Monaco editor instance
	const editor = monaco.editor.create(document.getElementById("editor"), { padding: { top: 8, bottom: 8 }, });
	await workspace.openTextDocument("App.ripple");

	let files: Map<string, string>;

	async function copy_fs(pwd: string) { // recursively copies files
		console.log('copying')
		const contents = await workspace.fs.readDirectory(pwd);

		// type -> modern-monaco/workspace FileStat.Type
		// 0: unknown, 1: file, 2: directory, 64: symlink
		for (const [name, type] of contents) {
			const full_path = pwd + name;
			switch (type) {
				case 1:
					files.set(full_path, await workspace.fs.readTextFile(full_path))
					break;
				case 2:
					await copy_fs(full_path + '/');
					break;
				default:
					console.warn(`[copy_fs] \`${full_path}\` is not a file or folder. How??`)
					break;
			}
		}
	}

	const update_sb = debounce(
		async () => {
			const bundle = Comlink.wrap(new bundleWorker())
			files = new Map();
			await copy_fs('/')
			const result = await bundle(JSON.stringify(files, map_serializer));

			const sb_ele = document.getElementById('sandbox')
			// sb_ele?.setAttribute('src', URL.createObjectURL(new Blob([result], { type: 'text/html' })))
			sb_ele?.setAttribute('src', `data:text/html;base64,${btoa(result)}`)
		},
		DEBOUNCE_MS
	)

	editor.onDidChangeModelContent((e) => {
		console.log(e);
		update_sb();
	})

	// init the sandbox once
	update_sb()
	// editor.dispose()
	return editor;
}

function map_serializer(key, value) {
	if (value instanceof Map) {
		return {
			dataType: 'Map',
			value: Array.from(value.entries()), // or with spread: value: [...value]
		};
	} else {
		return value;
	}
}