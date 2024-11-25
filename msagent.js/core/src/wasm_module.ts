export interface WebassemblyOwnMemoryExports extends WebAssembly.Exports {
	memory: WebAssembly.Memory;
}

// A helper for WASM modules.
// This currently only works for modules that export their own memory,
// and do not import it.
//
// This covers all of the modules in the core so far, so
// this is perfectly fine, but it's still worth noting.
export class WasmModule<TExports extends WebassemblyOwnMemoryExports> {
	private module: WebAssembly.WebAssemblyInstantiatedSource | null = null;
	private url: URL;

	constructor(url: URL) {
		this.url = url;
	}

	async Initalize(): Promise<void> {
		this.module = await WebAssembly.instantiateStreaming(fetch(this.url));
	}

	get Module() {
		if (this.module == null) throw new Error('WasmModule<T> has not been initalized');
		return this.module;
	}

	get Exports() {
		let module = this.Module;
		return module.instance.exports as TExports;
	}

    // Grows the WebAssembly heap if required.
	growHeapTo(newSize: number) {
		let exports = this.Exports;
		let memory: WebAssembly.Memory = exports.memory;
		if (memory.buffer.byteLength < newSize) {
			// A WebAssembly page is 64kb, so we need to grow at least a single page,
			// even if it would be relatively wasteful to do so.
			let npages = Math.floor(newSize / 65535) + 1;
			memory.grow(npages);
		}
	}
}
