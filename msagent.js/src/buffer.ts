// This is more a utility thing but it will more than likely only ever
// be used in the msagent.js code so /shrug

export enum SeekDir {
	BEG = 0,
	CUR = 1,
	END = 2
}

// A helper over DataView to make it more ergonomic for parsing file data.
export class BufferStream {
	private bufferImpl: Uint8Array;
	private dataView: DataView;
	private readPointer: number = 0;

	constructor(buffer: Uint8Array, byteOffset?: number) {
		this.bufferImpl = buffer;
		this.dataView = new DataView(this.bufferImpl.buffer, byteOffset);
	}

	seek(where: number, whence: SeekDir) {
		switch (whence) {
			case SeekDir.BEG:
				this.readPointer = where;
				break;

			case SeekDir.CUR:
				this.readPointer += where;
				break;

			case SeekDir.END:
				if (where > 0) throw new Error('Cannot use SeekDir.END with where greater than 0');

				this.readPointer = this.bufferImpl.length + whence;
				break;
		}

		return this.readPointer;
	}

	tell() {
		return this.seek(0, SeekDir.CUR);
	}

	// common impl function for read*()
	private readImpl<T>(func: (this: DataView, offset: number, le?: boolean | undefined) => T, size: number, le?: boolean | undefined) {
		let res = func.call(this.dataView, this.readPointer, le);
		this.readPointer += size;
		return res;
	}

	// Creates a view of a part of the buffer.
	// THIS DOES NOT DEEP COPY!
	subBuffer(len: number) {
		let oldReadPointer = this.readPointer;
		let buffer = this.bufferImpl.subarray(oldReadPointer, oldReadPointer + len);
		this.readPointer += len;
		return new BufferStream(buffer, oldReadPointer);
	}

	readS8() {
		return this.readImpl(DataView.prototype.getInt8, 1);
	}
	readU8() {
		return this.readImpl(DataView.prototype.getUint8, 1);
	}
	readS16LE() {
		return this.readImpl(DataView.prototype.getInt16, 2, true);
	}
	readS16BE() {
		return this.readImpl(DataView.prototype.getInt16, 2, false);
	}
	readU16LE() {
		return this.readImpl(DataView.prototype.getUint16, 2, true);
	}
	readU16BE() {
		return this.readImpl(DataView.prototype.getUint16, 2, false);
	}
	readS32LE() {
		return this.readImpl(DataView.prototype.getInt32, 4, true);
	}
	readS32BE() {
		return this.readImpl(DataView.prototype.getInt32, 4, false);
	}
	readU32LE() {
		return this.readImpl(DataView.prototype.getUint32, 4, true);
	}
	readU32BE() {
		return this.readImpl(DataView.prototype.getUint32, 4, false);
	}

	// Use this for temporary offset modification, e.g: when reading
	// a structure *pointed to* inside another structure.
	withOffset(where: number, cb: () => void) {
		let last = this.tell();
		this.seek(where, SeekDir.BEG);
		cb();
		this.seek(last, SeekDir.BEG);
	}

	readBool(): boolean {
		let res = this.readU8();
		return res != 0;
	}

	readString<TChar extends number>(len: number, charReader: (this: BufferStream) => TChar): string {
		let str = '';

		for (let i = 0; i < len; ++i) str += String.fromCharCode(charReader.call(this));

		// dispose of a nul terminator. We don't support other bare Agent formats,
		// so we shouldn't need to add the "support" for that.
		charReader.call(this);
		return str;
	}

	readPascalString(lengthReader: (this: BufferStream) => number = BufferStream.prototype.readU32LE, charReader: (this: BufferStream) => number = BufferStream.prototype.readU16LE) {
		let len = lengthReader.call(this);
		if (len == 0) return '';

		return this.readString(len, charReader);
	}

	readDataChunkBuffer(lengthReader: (this: BufferStream) => number = BufferStream.prototype.readU32LE) {
		let len = lengthReader.call(this);
		return this.subBuffer(len);
	}

	readDataChunk(lengthReader: (this: BufferStream) => number = BufferStream.prototype.readU32LE) {
		return this.readDataChunkBuffer(lengthReader).raw();
	}

	// reads a counted list. The length reader is on the other end so you don't need to specify it
	// (if it's u32)
	readCountedList<TObject>(objReader: (stream: BufferStream) => TObject, lengthReader: (this: BufferStream) => number = BufferStream.prototype.readU32LE): TObject[] {
		let len = lengthReader.call(this);
		let arr: TObject[] = [];
		if (len == 0) return arr;

		for (let i = 0; i < len; ++i) arr.push(objReader(this));

		return arr;
	}

	raw() {
		return this.bufferImpl;
	}
}
