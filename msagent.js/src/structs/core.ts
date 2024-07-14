import { BufferStream, SeekDir } from '../buffer.js';
import { compressDecompress } from '../decompress.js';

// Win32 Rect
export class RECT {
	left = 0;
	top = 0;
	right = 0;
	bottom = 0;

	static read(buffer: BufferStream) {
		let rect = new RECT();
		rect.left = buffer.readU32LE();
		rect.top = buffer.readU32LE();
		rect.right = buffer.readU32LE();
		rect.bottom = buffer.readU32LE();
		return rect;
	}
}

export class RGNDATAHEADER {
	size = 0x20;
	type = 1;
	count = 0;
	rgnSize = 0;
	bound = new RECT();

	static read(buffer: BufferStream) {
		let hdr = new RGNDATAHEADER();

		hdr.size = buffer.readU32LE();
		if (hdr.size != 0x20) throw new Error('Invalid RGNDATAHEADER!');

		hdr.type = buffer.readU32LE();
		if (hdr.type != 1) throw new Error('Invalid RGNDATAHEADER type (only rectangles are supported)!');

		hdr.count = buffer.readU32LE();
		hdr.rgnSize = buffer.readU32LE();

		hdr.bound = RECT.read(buffer);

		return hdr;
	}
}

export class RGNDATA {
	header = new RGNDATAHEADER();
	rects: RECT[] = [];

	static read(buffer: BufferStream) {
		let region = new RGNDATA();
		region.header = RGNDATAHEADER.read(buffer);

		for (let i = 0; i < region.header.count; ++i) {
			region.rects.push(RECT.read(buffer));
		}

		return region;
	}
}

export class GUID {
	bytes: number[] = [];

	static read(buffer: BufferStream) {
		let guid = new GUID();

		for (var i = 0; i < 16; ++i) {
			guid.bytes.push(buffer.readU8());
		}

		return guid;
	}
}

export class LOCATION {
	offset: number = 0;
	size: number = 0;

	static read(buffer: BufferStream) {
		let loc = new LOCATION();
		loc.offset = buffer.readU32LE();
		loc.size = buffer.readU32LE();
		return loc;
	}
}

export class RGBAColor {
	r = 0;
	g = 0;
	b = 0;
	a = 0;

	// Does what it says on the tin, converts to a packed 32-bit RGBA value
	to_rgba(): number {
		return (this.a << 24) | (this.r << 16) | (this.g << 8) | this.b;
	}

	static from_gdi_rgbquad(val: number) {
		let quad = new RGBAColor();

		// Extract individual RGB values from the RGBQUAD
		// We ignore the last 8 bits because it is always left
		// as 0x00 or if uncleared, just random garbage.

		// this is wrong
		//quad.r = (val & 0xff000000) >> 24;
		//quad.g = (val & 0x00ff0000) >> 16;
		//quad.b = (val & 0x0000ff00) >> 8;

		quad.r = val & 0x000000ff;
		quad.g = (val & 0x0000ff00) >> 8;
		quad.b = (val & 0x00ff0000) >> 16;

		quad.a = 255;
		return quad;
	}

	static read(buffer: BufferStream) {
		return RGBAColor.from_gdi_rgbquad(buffer.readU32LE());
	}
}

export class COMPRESSED_DATABLOCK {
	data: Uint8Array = new Uint8Array();

	static read(buffer: BufferStream) {
		let compressed = new COMPRESSED_DATABLOCK();

		let compressedSize = buffer.readU32LE();
		let uncompressedSize = buffer.readU32LE();

		if (compressedSize == 0) compressed.data = buffer.subBuffer(uncompressedSize).raw();
		else {
			let data = buffer.subBuffer(compressedSize).raw();
			compressed.data = new Uint8Array(uncompressedSize);
			compressDecompress(data, compressed.data);
		}

		return compressed;
	}
}
