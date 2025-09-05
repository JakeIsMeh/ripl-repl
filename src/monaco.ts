import { init, Workspace } from "modern-monaco";
import { debounce } from "perfect-debounce";

const DEBOUNCE_MS = 300

export async function init_monaco() {
	const workspace = new Workspace({
		/** The name of the workspace, used for project isolation. Default is "default". */
		name: "ripple-playground",
		/** Initial files in the workspace. */
		initialFiles: {
			"index.html": `<html><head><title>Hello, world!</title></head><body><script src="main.js"></script></body></html>`,
			"main.js": `console.log("Hello, world!")`,
		},
		/** File to open when the editor is loaded for the first time. */
		entryFile: "index.html",
	});

	// load monaco-editor-core.js
	const monaco = await init({ workspace });

	// create a Monaco editor instance
	const editor = monaco.editor.create(document.getElementById("editor"), { padding: { top: 8, bottom: 8 }, });
	await workspace.openTextDocument('main.js');

	const files = await workspace.fs.readDirectory('/');
	console.log(files)

	const update_sb = debounce(
		async () => {
			
		},
		DEBOUNCE_MS
	)

	editor.onDidChangeModelContent((e) => { update_sb() })

	// editor.dispose()
	return editor;
}