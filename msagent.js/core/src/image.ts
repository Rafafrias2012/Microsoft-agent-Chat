import { AcsImageEntry } from './structs/image';

// probably should be in a utility module
function dwAlign(off: number): number {
	let ul = off >>> 0;

	ul += 3;
	ul >>= 2;
	ul <<= 2;
	return ul;
}

import { BufferStream, SeekDir } from './buffer';
import { RGBAColor } from './structs/core';

/// Draws an ACS image to a newly allocated buffer.
/// This function normalizes the agent 8bpp DIB format to a saner RGBA format,
/// that can be directly converted to an ImageData for drawing to a web canvas.
///
/// However, that should be done (and is done) by a higher level web layer.
export function imageDrawToBuffer(imageEntry: AcsImageEntry, palette: RGBAColor[]) {
	let rgbaBuffer = new Uint32Array(imageEntry.image.width * imageEntry.image.height);

	let buffer = imageEntry.image.data;
	let bufStream = new BufferStream(buffer);

	let rows = new Array<Uint8Array>(imageEntry.image.height - 1);

	// Read all the rows bottom-up first. This idiosyncracy is due to the fact
	// that the bitmap data is actually formatted to be used as a GDI DIB
	// (device-independent bitmap), so it inherits all the strange baggage from that.
	for (let y = imageEntry.image.height - 1; y >= 0; --y) {
		let row = bufStream.subBuffer(imageEntry.image.width).raw();
		rows[y] = row.slice(0, imageEntry.image.width);

		// Seek to the next DWORD aligned spot to get to the next row.
		// For most images this may mean not seeking at all.
		bufStream.seek(dwAlign(bufStream.tell()), SeekDir.BEG);
	}

	// Next, draw the rows converted to RGBA, top down (so it's drawn correctly,
	// and in the RGBA format we want to return)
	for (let y = 0; y < imageEntry.image.height - 1; ++y) {
		let row = rows[y];
		for (let x = 0; x < imageEntry.image.width; ++x) {
			rgbaBuffer[y * imageEntry.image.width + x] = palette[row[x]].to_rgba();
		}
	}
	return rgbaBuffer;
}
