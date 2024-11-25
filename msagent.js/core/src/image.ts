import { AcsImageEntry } from './structs/image';
import { RGBAColor } from './structs/core';

// probably should be in a utility module
function dwAlign(off: number): number {
	let ul = off >>> 0;

	ul += 3;
	ul >>= 2;
	ul <<= 2;
	return ul;
}

/// Draws an ACS image to a newly allocated buffer.
/// This function normalizes the agent 8bpp DIB format to a saner RGBA format,
/// that can be directly converted to an ImageData for drawing to a web canvas.
///
/// However, that should be done (and is done) by a higher level web layer.
export function imageDrawToBuffer(imageEntry: AcsImageEntry, palette: RGBAColor[]) {
	let rgbaBuffer = new Uint32Array(imageEntry.image.width * imageEntry.image.height);
	let buffer = imageEntry.image.data;

	// Next, draw the rows converted to RGBA, top down (so it's drawn correctly,
	// and in the RGBA format we want to return)
	for (let y = 0; y < imageEntry.image.height - 1; ++y) {
		// flip y so it's all top down properly
		let yy = imageEntry.image.height - 1 - y;
		let rowStartOffset = yy * dwAlign(imageEntry.image.width);

		for (let x = 0; x < imageEntry.image.width; ++x) {
			rgbaBuffer[y * imageEntry.image.width + x] = palette[buffer[rowStartOffset + x]].to_rgba();
		}
	}
	return rgbaBuffer;
}
