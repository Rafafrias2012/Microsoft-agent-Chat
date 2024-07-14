// Please note that the "meaningless" shifts of 0 are to force
// the value to be a 32-bit integer. Do not remove them.

let compressWasm: WebAssembly.WebAssemblyInstantiatedSource;

interface CompressWasmExports {
	memory: WebAssembly.Memory;
	agentDecompressWASM: any;
}

// Initalize the decompression module
export async function compressInit() {
	let url = new URL('decompress.wasm', import.meta.url);
	compressWasm = await WebAssembly.instantiateStreaming(fetch(url));
}

function compressWasmGetExports() {
	return compressWasm.instance.exports as any as CompressWasmExports;
}

function compressWASMGetMemory(): WebAssembly.Memory {
	return compressWasmGetExports().memory;
}

// debugging
//(window as any).DEBUGcompressGetWASM = () => {
//	return compressWasm;
//}

// Decompress Agent compressed data. This compression algorithm sucks.
// [dest] is to be preallocated to the decompressed data size.
export function compressDecompress(src: Uint8Array, dest: Uint8Array) {
	// Grow the WASM heap if needed. Funnily enough, this code is never hit in most
	// ACSes, so IDK if it's even needed
	let memory = compressWASMGetMemory();
	if (memory.buffer.byteLength < src.length + dest.length) {
		// A WebAssembly page is 64kb, so we need to grow at least that much
		let npages = Math.floor((src.length + dest.length) / 65535) + 1;
		console.log('Need to grow WASM heap', npages, 'pages', '(current byteLength is', memory.buffer.byteLength, ', we need', src.length + dest.length, ')');
		memory.grow(npages);
	}

	let copyBuffer = new Uint8Array(memory.buffer);

	// Copy source to memory[0]. This will make things a bit simpler
	copyBuffer.set(src, 0);

	// Call the WASM compression routine
	let nrBytesDecompressed = compressWasmGetExports().agentDecompressWASM(0, src.length, src.length, dest.length);

	if (nrBytesDecompressed != dest.length) throw new Error(`decompression failed: ${nrBytesDecompressed} != ${dest.length}`);

	// Dest will be memory[src.length..dest.length]
	dest.set(copyBuffer.slice(src.length, src.length + dest.length), 0);
}
