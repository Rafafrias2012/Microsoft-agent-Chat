import { WasmModule, WebassemblyOwnMemoryExports } from './wasm_module';

// WASM exports for the decompression module.
interface CompressWasmExports extends WebassemblyOwnMemoryExports {
	agentDecompressWASM: (pSource: number, sourceLen: number, pDest: number, destLen: number) => number;
}

let compressWasm = new WasmModule<CompressWasmExports>(new URL('decompress.wasm', import.meta.url));

// Initalize the decompression module
export async function compressInit() {
	await compressWasm.Initalize();
}

function compressWasmGetExports() {
	return compressWasm.Exports;
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
	compressWasm.growHeapTo(src.length + dest.length);

	let memory = compressWASMGetMemory();
	let copyBuffer = new Uint8Array(memory.buffer);

	// Copy source to memory[0]. This will make things a bit simpler
	copyBuffer.set(src, 0);

	// Call the WASM compression routine
	let nrBytesDecompressed = compressWasmGetExports().agentDecompressWASM(0, src.length, src.length, dest.length);

	if (nrBytesDecompressed != dest.length) throw new Error(`decompression failed: ${nrBytesDecompressed} != ${dest.length}`);

	// The uncompressed data is located at memory[src.length..dest.length].
	// Copy it into the destination buffer.
	dest.set(copyBuffer.slice(src.length, src.length + dest.length), 0);
}
