import { BufferStream, SeekDir, imageDrawToBuffer } from '@msagent.js/core';
import { AcsData } from '@msagent.js/core';
import { ContextMenu, ContextMenuItem } from './contextmenu.js';
import { AcsAnimation, AcsAnimationFrameInfo } from '@msagent.js/core';
import { AcsImageEntry } from '@msagent.js/core';
import { Point, Size } from '@msagent.js/core';
import { wordballoonDrawImage, wordballoonDrawText } from './wordballoon.js';



function randint(min: number, max: number) {
	return Math.floor(Math.random() * (max - min) + min);
}

// animation state (used during animation playback)
class AgentAnimationState {
	char: Agent;
	anim: AcsAnimation;
	private cancelled: boolean = false;

	finishCallback: () => void;
	frameIndex = 0;

	interval = 0;

	constructor(char: Agent, anim: AcsAnimation, finishCallback: () => void) {
		this.char = char;
		this.anim = anim;
		this.finishCallback = finishCallback;
	}

	// start playing the animation
	play() {
		this.nextFrame();
	}

	cancel() {
		this.cancelled = true;
		clearTimeout(this.interval);
	}

	nextFrame() {
		requestAnimationFrame(() => {
			if (this.cancelled) return;
			this.char.drawAnimationFrame(this.anim.frameInfo[this.frameIndex++]);

			if (this.frameIndex >= this.anim.frameInfo.length) {
				this.finishCallback();
				return;
			}

			//@ts-ignore
			this.interval = setTimeout(() => {
				this.nextFrame();
			}, this.anim.frameInfo[this.frameIndex].frameDuration * 10);
		});
	}
}

enum AgentWordBalloonPosition {
	AboveCentered,
	BelowCentered
}

abstract class AgentWordBalloonState {
	abstract char: Agent;
	abstract hasTip: boolean;
	abstract position: AgentWordBalloonPosition;

	balloonCanvas: HTMLCanvasElement;
	balloonCanvasCtx: CanvasRenderingContext2D;

	constructor() {
		this.balloonCanvas = document.createElement('canvas');
		this.balloonCanvasCtx = this.balloonCanvas.getContext('2d')!;
		this.balloonCanvas.style.position = 'absolute';
		this.balloonCanvas.style.pointerEvents = 'none';
	}

	show() {
		this.balloonCanvas.style.display = 'block';
	}

	hide() {
		this.balloonCanvas.style.display = 'none';
	}

	finish() {
		this.balloonCanvas.remove();
	}

	positionUpdated() {
		let size = this.char.getSize();
		this.balloonCanvas.style.left = -(this.balloonCanvas.width / 2 - size.w / 2) + 'px';
		switch (this.position) {
			case AgentWordBalloonPosition.AboveCentered: {
				this.balloonCanvas.style.top = -this.balloonCanvas.height + 'px';
				break;
			}
			case AgentWordBalloonPosition.BelowCentered: {
				this.balloonCanvas.style.bottom = -this.balloonCanvas.height + 'px';
				break;
			}
		}
	}
}

class AgentTextWordBalloonState extends AgentWordBalloonState {
	char: Agent;
	text: string;
	hasTip: boolean;
	position: AgentWordBalloonPosition;

	constructor(char: Agent, text: string, hasTip: boolean, position: AgentWordBalloonPosition, textColor: string) {
		super();
		this.char = char;
		this.text = text;
		this.hasTip = hasTip;
		this.position = position;
		this.balloonCanvasCtx.font = '14px arial';

		this.balloonCanvas.width = 300;
		this.balloonCanvas.height = 300;

		let rect = wordballoonDrawText(this.balloonCanvasCtx, { x: 0, y: 0 }, this.text, 20, hasTip, textColor);

		// Second pass, actually set the element to the right width and stuffs
		this.balloonCanvas.width = rect.w;
		this.balloonCanvas.height = rect.h;

		wordballoonDrawText(this.balloonCanvasCtx, { x: 0, y: 0 }, this.text, 20, hasTip, textColor);

		this.char.getElement().appendChild(this.balloonCanvas);

		this.show();
	}
}

class AgentImageWordBalloonState extends AgentWordBalloonState {
	char: Agent;
	img: HTMLImageElement;
	hasTip: boolean;
	position: AgentWordBalloonPosition;

	constructor(char: Agent, img: HTMLImageElement, hasTip: boolean, position: AgentWordBalloonPosition) {
		super();
		this.char = char;
		this.img = img;
		this.hasTip = hasTip;
		this.position = position;

		this.balloonCanvas.width = 300;
		this.balloonCanvas.height = 300;

		let rect = wordballoonDrawImage(this.balloonCanvasCtx, { x: 0, y: 0 }, this.img, hasTip);

		// Second pass, actually set the element to the right width and stuffs
		this.balloonCanvas.width = rect.w;
		this.balloonCanvas.height = rect.h;

		wordballoonDrawImage(this.balloonCanvasCtx, { x: 0, y: 0 }, this.img, hasTip);

		this.char.getElement().appendChild(this.balloonCanvas);
		this.show();
	}
}

export class Agent {
	private data: AcsData;
	private charDiv: HTMLDivElement;
	private cnv: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;

	private dragging: boolean;
	private x: number;
	private y: number;

	private lastTouchX: number;
	private lastTouchY: number;

	private animState: AgentAnimationState | null = null;
	private wordballoonState: AgentWordBalloonState | null = null;
	private usernameBalloonState: AgentTextWordBalloonState | null = null;

	private contextMenu: ContextMenu;

	constructor(data: AcsData) {
		this.data = data;
		this.charDiv = document.createElement('div');
		this.charDiv.classList.add('agent-character');

		this.charDiv.style.position = 'fixed';

		this.cnv = document.createElement('canvas');
		this.ctx = this.cnv.getContext('2d')!;
		this.cnv.width = data.characterInfo.charWidth;
		this.cnv.height = data.characterInfo.charHeight;
		this.cnv.style.display = 'none';

		this.contextMenu = new ContextMenu(this.charDiv);

		this.charDiv.appendChild(this.cnv);

		this.dragging = false;
		this.x = 0;
		this.y = 0;

		this.lastTouchX = 0;
		this.lastTouchY = 0;

		this.setLoc();
		this.cnv.addEventListener('mousedown', () => {
			this.dragging = true;
			document.addEventListener(
				'mouseup',
				() => {
					this.dragging = false;
				},
				{ once: true }
			);
		});

		this.cnv.addEventListener('touchstart', (e) => {
			const touch = e.touches[0];
			this.lastTouchX = touch.clientX;
			this.lastTouchY = touch.clientY;
			this.dragging = true;
			document.addEventListener(
				'touchend',
				() => {
					this.dragging = false;
				},
				{ once: true }
			);
		});

		document.addEventListener('touchmove', (e) => {
			if (!this.dragging) return;

			const touch = e.touches[0];

			const movementX = touch.clientX - this.lastTouchX;
			const movementY = touch.clientY - this.lastTouchY;
			this.lastTouchX = touch.clientX;
			this.lastTouchY = touch.clientY;
			this.x += movementX;
			this.y += movementY;
			this.setLoc();
		});

		this.cnv.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.contextMenu.show(e.clientX, e.clientY);
		});

		document.addEventListener('mousemove', (e) => {
			if (!this.dragging) return;
			this.x += e.movementX;
			this.y += e.movementY;
			this.setLoc();
		});

		window.addEventListener('resize', () => {
			this.setLoc();
		});
	}

	private setLoc() {
		if (this.x < 0) this.x = 0;
		if (this.y < 0) this.y = 0;
		if (this.x > document.documentElement.clientWidth - this.cnv.width) this.x = document.documentElement.clientWidth - this.cnv.width;
		if (this.y > document.documentElement.clientHeight - this.cnv.height) this.y = document.documentElement.clientHeight - this.cnv.height;
		this.charDiv.style.top = this.y + 'px';
		this.charDiv.style.left = this.x + 'px';

		if (this.wordballoonState) this.wordballoonState.positionUpdated();
	}

	getElement() {
		return this.charDiv;
	}

	getContextMenu() {
		return this.contextMenu;
	}

	getAt() {
		let point: Point = {
			x: this.x,
			y: this.y
		};
		return point;
	}

	getSize(): Size {
		return {
			w: this.data.characterInfo.charWidth,
			h: this.data.characterInfo.charHeight
		};
	}

	drawAnimationFrame(frame: AcsAnimationFrameInfo) {
		this.ctx.clearRect(0, 0, this.cnv.width, this.cnv.height);
		for (const mimg of frame.images) {
			this.drawImage(this.data.images[mimg.imageIndex], mimg.xOffset, mimg.yOffset);
		}
	}

	// Draw a single image from the agent's image table.
	drawImage(imageEntry: AcsImageEntry, xOffset: number, yOffset: number) {
		let rgbaBuffer = imageDrawToBuffer(imageEntry, this.data.characterInfo.palette);
		let data = new ImageData(new Uint8ClampedArray(rgbaBuffer.buffer), imageEntry.image.width, imageEntry.image.height);
		this.ctx.putImageData(data, xOffset, yOffset);
	}

	addToDom(parent: HTMLElement = document.body) {
		if (this.charDiv.parentElement) return;
		parent.appendChild(this.charDiv);
	}

	remove() {
		this.charDiv.remove();
	}

	// add promise versions later.
	playAnimation(index: number, finishCallback: () => void) {
		if (this.animState != null) {
			this.animState.cancel();
			this.animState = null;
		}
		let animInfo = this.data.animInfo[index];

		// Create and start the animation state
		this.animState = new AgentAnimationState(this, animInfo.animationData, () => {
			this.animState = null;
			finishCallback();
		});
		this.animState.play();
	}

	playAnimationByName(name: string, finishCallback: () => void) {
		let index = this.data.animInfo.findIndex((n) => n.name == name);
		if (index !== -1) this.playAnimation(index, finishCallback);
	}

	playAnimationByNamePromise(name: string): Promise<void> {
		return new Promise((res, rej) => {
			this.playAnimationByName(name, () => res());
		});
	}

	setUsername(username: string, color: string) {
		if (this.usernameBalloonState !== null) {
			this.usernameBalloonState.finish();
			this.usernameBalloonState = null;
		}

		this.usernameBalloonState = new AgentTextWordBalloonState(this, username, false, AgentWordBalloonPosition.BelowCentered, color);
		this.usernameBalloonState.show();
	}

	speak(text: string) {
		if (this.wordballoonState != null) {
			this.stopSpeaking();
		}

		this.wordballoonState = new AgentTextWordBalloonState(this, text, true, AgentWordBalloonPosition.AboveCentered, '#000000');
		this.wordballoonState.positionUpdated();
		this.wordballoonState.show();
	}

	speakImage(img: HTMLImageElement) {
		if (this.wordballoonState != null) {
			this.stopSpeaking();
		}

		this.wordballoonState = new AgentImageWordBalloonState(this, img, true, AgentWordBalloonPosition.AboveCentered);
		this.wordballoonState.positionUpdated();
		this.wordballoonState.show();
	}

	stopSpeaking() {
		if (this.wordballoonState !== null) {
			this.wordballoonState.finish();
			this.wordballoonState = null;
		}
	}

	show() {
		this.x = randint(0, document.documentElement.clientWidth - this.data.characterInfo.charWidth);
		this.y = randint(0, document.documentElement.clientHeight - this.data.characterInfo.charHeight);
		this.setLoc();
		this.cnv.style.display = 'block';
	}

	hide(remove: boolean = false) {
		if (remove) this.remove();
		else this.cnv.style.display = 'none';
	}

	listAnimations() {
		return this.data.animInfo.map((n) => n.name);
	}
}
