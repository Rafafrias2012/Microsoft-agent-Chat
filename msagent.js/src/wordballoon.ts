import { spriteCutSpriteFromSpriteSheet, spriteDraw, spriteDrawRotated, spriteLoadImage } from './sprite';
import { Point, Rect, Size } from './types';

let corner_sprite: HTMLImageElement;
let straight_sprite: HTMLImageElement;
let tip_sprite: HTMLImageElement;

// Call *once* to initalize the wordballoon drawing system.
// Do not call other wordballoon* functions WITHOUT doing so.
export async function wordballoonInit() {
	// Load the spritesheet
	let sheet = await spriteLoadImage(new URL('../res/wordballoon.png', import.meta.url).toString());

	// Cut out the various sprites we need to draw from the sheet.

	corner_sprite = await spriteCutSpriteFromSpriteSheet(sheet, {
		x: 0,
		y: 0,
		w: 12,
		h: 13
	});

	straight_sprite = await spriteCutSpriteFromSpriteSheet(sheet, {
		x: 12,
		y: 0,
		w: 12,
		h: 13
	});

	tip_sprite = await spriteCutSpriteFromSpriteSheet(sheet, {
		x: 24,
		y: 0,
		w: 10,
		h: 18
	});
}

// This function returns a rect which is the usable inner contents of the box.
export function wordballoonDraw(ctx: CanvasRenderingContext2D, at: Point, size: Size, hasTip: boolean = true): Rect {
	// Snap the size to a clean 12x12 system,
	// so we stay (as close to) pixel perfect as possible.
	// This is "lazy" but oh well. It works!
	size.w -= size.w % 12;
	size.h -= size.h % 12;

	ctx.save();

	// TODO: When we get the custom 2bpp gzip sprite stuff to work, we should set this up
	// so it fills the *agent's* configured background color.
	// This is just because our image is this color anyways, so it makes no sense to make it customizable *right now*.

	ctx.fillStyle = '#ffffe7';

	// Fill the inner portion of the balloon.
	ctx.fillRect(at.x + 12, at.y + 12, size.w, size.h);

	// draw the left side corner
	spriteDraw(ctx, corner_sprite, at.x, at.y);

	// draw the straight part of the balloon
	let i = 1;
	for (; i < size.w / 12 + 1; ++i) {
		spriteDraw(ctx, straight_sprite, at.x + 12 * i, at.y);
	}

	// draw the right side corner
	spriteDrawRotated(ctx, corner_sprite, 90, at.x + 12 * i, at.y);

	// Draw both the left and right sides of the box. We can do this in one pass
	// so we do that for simplicity.
	let j = 1;
	for (; j < size.h / 12; ++j) {
		spriteDrawRotated(ctx, straight_sprite, 270, at.x, at.y + 12 * j);
		spriteDrawRotated(ctx, straight_sprite, 90, at.x + 12 * i, at.y + 12 * j);
	}

	// Draw the bottom left corner
	spriteDrawRotated(ctx, corner_sprite, 270, at.x, at.y + 12 * j);

	// Draw the bottom of the box
	i = 1;
	for (; i < size.w / 12 + 1; ++i) {
		spriteDrawRotated(ctx, straight_sprite, 180, at.x + 12 * i, at.y + 12 * j);
	}

	// Draw the bottom right corner
	spriteDrawRotated(ctx, corner_sprite, 180, at.x + 12 * i, at.y + 12 * j);

	// TODO: a tip point should be provided. We will pick the best corner to stick it on,
	// and the best y coordinate on that corner to stick it on.
	//
	// For now, we always simply use the center of the bottom..

	// Draw the tip.
	if (hasTip) spriteDraw(ctx, tip_sprite, at.x + size.w / 2, at.y + 12 * (j + 1) - 1);

	ctx.restore();

	return {
		x: at.x + 12 * 2,
		y: at.y + 13 * 2,

		w: size.w - 12 * 2,
		h: size.h - 13 * 2
	};
}

function wordWrapToStringList(text: string, maxLength: number) {
	// this was stolen off stackoverflow, it sucks but it (kind of) works
	// it should probably be replaced at some point.
	var result = [],
		line: string[] = [];
	var length = 0;
	text.split(' ').forEach(function (word) {
		if (length + word.length >= maxLength) {
			result.push(line.join(' '));
			line = [];
			length = 0;
		}
		length += word.length + 1;
		line.push(word);
	});
	if (line.length > 0) {
		result.push(line.join(' '));
	}
	return result;
}

// This draws a wordballoon with text. This function respects the current context's font settings and does *not* modify them.
export function wordballoonDrawText(ctx: CanvasRenderingContext2D, at: Point, text: string, maxLen: number = 20, hasTip: boolean = true, color: string = '#000000'): Rect {
	let lines = wordWrapToStringList(text, maxLen);

	// Create metrics for each line
	let metrics = lines.map((line) => {
		return ctx.measureText(line);
	});

	let size = {
		w: 0,
		h: 26
	};

	// Work out the size of the wordballoon based on the metrics
	for (let metric of metrics) {
		let width = Math.abs(metric.actualBoundingBoxLeft) + Math.abs(metric.actualBoundingBoxRight);
		let height = metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent;

		// The largest line determines the total width of the balloon
		if (width > size.w) {
			size.w = width;
		}

		size.h += height * 1.25;
	}

	size.w = Math.floor(size.w + 12);
	size.h = Math.floor(size.h);

	// Draw the word balloon and get the inner rect
	let rectInner = wordballoonDraw(ctx, at, size, hasTip);

	// Draw all the lines of text
	let y = 0;
	for (let i in lines) {
		let metric = metrics[i];
		let height = metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent;

		ctx.fillStyle = color;
		ctx.fillText(lines[i], rectInner.x - 12, rectInner.y + y);
		y += height * 1.25;
	}

	return {
		x: at.x,
		y: at.y,
		w: rectInner.w + 12 * 3 + 12,
		h: rectInner.h + 13 * 3 + 18
	};
}
