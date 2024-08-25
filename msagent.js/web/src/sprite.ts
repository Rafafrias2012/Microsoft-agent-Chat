// Sprite utilities

import { Rect } from '@msagent.js/core';

// Load a image asynchronously
export async function spriteLoadImage(uri: string): Promise<HTMLImageElement> {
	return new Promise((res, rej) => {
		let image = new Image();
		image.onload = () => res(image);
		image.onerror = (err) => rej(new Error('Error loading image'));
		image.crossOrigin = 'anonymous';
		image.src = uri;
	});
}

export async function spriteCutSpriteFromSpriteSheet(spriteSheet: HTMLImageElement, rect: Rect) {
	let tmp_canvas = document.createElement('canvas');
	let ctx = tmp_canvas.getContext('2d')!;

	tmp_canvas.width = rect.w;
	tmp_canvas.height = rect.h;

	// draw the piece here!
	ctx.drawImage(spriteSheet, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

	return spriteLoadImage(tmp_canvas.toDataURL());
}

export function spriteDraw(ctx: CanvasRenderingContext2D, sprite: HTMLImageElement, x: number, y: number) {
	ctx.drawImage(sprite, x, y);
}

export function spriteDrawRotated(ctx: CanvasRenderingContext2D, sprite: HTMLImageElement, deg: number, x: number, y: number) {
	ctx.save();
	ctx.translate(x + sprite.width / 2, y + sprite.width / 2);
	ctx.rotate((deg * Math.PI) / 180);
	ctx.translate(-(x + sprite.width / 2), -(y + sprite.width / 2));
	spriteDraw(ctx, sprite, x, y);
	ctx.restore();
}
