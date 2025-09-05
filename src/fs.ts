import { fs, Stats, configureSingle, InMemory } from '@zenfs/core';
import type { FileStat } from 'modern-monaco/workspace';

await configureSingle({ backend: InMemory });

export class ZenFileSystem implements FileSystem {
	/**
	 * Initializes the ZenFS file system.
	 * In a real application, this configuration should be done once at startup.
	 */
	constructor() {
		// fs init is external, due to it being async.
	}

	/**
	 * Checks if a file or directory exists at the given path.
	 */
	private async _exists(path: string): Promise<boolean> {
		try {
			await fs.promises.stat(path);
			return true;
		} catch (e) {
			if (e.code === 'ENOENT') {
				return false;
			}
			throw e;
		}
	}

	/**
	 * Converts a ZenFS Stats object to a FileStat object.
	 */
	private _convertStatsToFileStat(stats: Stats): FileStat {
		let type: FileStat['type'];
		// 0: unknown, 1: file, 2: directory, 64: symlink
		if (stats.isFile()) {
			type = 1;
		} else if (stats.isDirectory()) {
			type = 2;
		} else if (stats.isSymbolicLink()) {
			type = 64;
		} else {
			type = 0;
		}
		return {
			type,
			ctime: stats.ctimeMs,
			mtime: stats.mtimeMs,
			size: stats.size,
			version: 0, // TODO: does this break anything?
		};
	}

	public async copy(source: string, target: string, options?: { overwrite: boolean }): Promise<void> {
		if (!(await this._exists(source))) {
			throw new Error(`Source file does not exist: ${source}`);
		}
		if (!options?.overwrite && (await this._exists(target))) {
			throw new Error(`Target file already exists: ${target}`);
		}
		const content = await this.readFile(source);
		await this.writeFile(target, content);
	}

	public async createDirectory(dir: string): Promise<void> {
		await fs.promises.mkdir(dir, { recursive: true });
	}

	public async delete(filename: string, options?: { recursive: boolean }): Promise<void> {
		const stats = await fs.promises.stat(filename);
		if (stats.isDirectory()) {
			await fs.promises.rm(filename, { recursive: options?.recursive ?? false });
		} else {
			await fs.promises.unlink(filename);
		}
	}

	public async readDirectory(filename: string): Promise<[string, FileType][]> {
		const entries = await fs.promises.readdir(filename);
		const results: Promise<[string, FileType]>[] = entries.map(async (entry) => {
			// A simple path join. For more complex scenarios, a path library would be better.
			const fullPath = filename === '/' ? `/${entry}` : filename.endsWith('/') ? `${filename}${entry}` : `${filename}/${entry}`;
			try {
				const stats = await fs.promises.stat(fullPath);
				const fileStat = this._convertStatsToFileStat(stats);
				return [entry, fileStat.type];
			} catch (e) {
				// Handle cases where the file might be deleted between readdir and stat
				return [entry, FileType.Unknown];
			}
		});
		return Promise.all(results);
	}

	public async readFile(filename: string): Promise<Uint8Array> {
		// ZenFS's readFile returns a Buffer, which is a Uint8Array subclass.
		return fs.promises.readFile(filename) as Promise<Uint8Array>;
	}

	public async readTextFile(filename: string): Promise<string> {
		return fs.promises.readFile(filename, 'utf8');
	}

	public async rename(oldName: string, newName: string, options?: { overwrite: boolean }): Promise<void> {
		if (options?.overwrite && (await this._exists(newName))) {
			// To ensure atomic-like overwrite, we could rename to a temp file first,
			// but a simple delete is more straightforward for most backends.
			await this.delete(newName, { recursive: true });
		}
		await fs.promises.rename(oldName, newName);
	}

	public async stat(filename: string): Promise<FileStat> {
		const stats = await fs.promises.stat(filename);
		return this._convertStatsToFileStat(stats);
	}

	public async writeFile(filename: string, content: string | Uint8Array): Promise<void> {
		// The `context` parameter from the interface is ignored as it's not
		// relevant to the low-level file writing operation.
		await fs.promises.writeFile(filename, content);
	}

	public watch(filename: string, ...args: any[]): () => void {
		const handle: FileSystemWatchHandle = args.length > 1 ? args[1] : args[0];
		const options: { recursive: boolean } = args.length > 1 ? args[0] : { recursive: false };

		// NOTE: ZenFS's watch functionality is based on polling and its event reporting
		// is basic. The event type 'rename' can mean creation, deletion, or an actual
		// rename. A more robust implementation would require maintaining state to
		// differentiate these events accurately.
		const watcher = fs.watch(filename, { recursive: options.recursive }, async (eventType, changedFile) => {
			if (!changedFile) return;

			const path = changedFile.toString();
			let type: FileChangeType;

			// Map ZenFS event type ('rename', 'change') to the interface's enum.
			if (eventType === 'change') {
				type = FileChangeType.Changed;
			} else if (eventType === 'rename') {
				// 'rename' is ambiguous. We check if the file exists to determine
				// if it was created or deleted.
				if (await this._exists(path)) {
					type = FileChangeType.Created;
				} else {
					type = FileChangeType.Deleted;
				}
			} else {
				return; // Ignore unknown event types.
			}

			handle({ type, path });
		});

		// Return a function that stops the watcher.
		return () => watcher.close();
	}
}