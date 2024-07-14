import { compressInit } from './decompress.js';
import { wordballoonInit } from './wordballoon.js';

export * from './types.js';
export * from './character.js';
export * from './decompress.js';
export * from './sprite.js';
export * from './wordballoon.js';
export * from './contextmenu.js';

// Convinence function which initalizes all of msagent.js.
export async function agentInit() {
	await compressInit();
	await wordballoonInit();
}
