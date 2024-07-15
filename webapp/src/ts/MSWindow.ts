export interface MSWindowConfig {
	minWidth: number;
	minHeight: number;
	maxWidth?: number | undefined;
	maxHeight?: number | undefined;
	startPosition: MSWindowStartPosition; // TODO: Should be a union with the enum and a "Point" (containing X and Y)
}

export enum MSWindowStartPosition {
	TopLeft,
	Center
}

export class MSWindow {
	wnd: HTMLDivElement;
	closeBtn: HTMLButtonElement | undefined;
	config: MSWindowConfig;
	titlebar: HTMLDivElement;
	body: HTMLDivElement;
	shown: boolean;
	dragging: boolean;
	x: number;
	y: number;
	lastTouchX: number;
	lastTouchY: number;
	constructor(wnd: HTMLDivElement, config: MSWindowConfig) {
		this.wnd = wnd;
		this.shown = false;
		this.config = config;
		this.wnd.style.minWidth = config.minWidth + 'px';
		this.wnd.style.minHeight = config.minHeight + 'px';

		if (config.maxWidth) this.wnd.style.maxWidth = config.maxWidth + 'px';
		if (config.maxHeight) this.wnd.style.maxHeight = config.maxHeight + 'px';

		this.wnd.classList.add('d-none');

		let titlebar = this.wnd.querySelector('div.title-bar');
		let body = this.wnd.querySelector('div.window-body');
		if (!titlebar || !body) throw new Error('MSWindow is missing titlebar or body element.');

		this.titlebar = titlebar as HTMLDivElement;
		this.body = body as HTMLDivElement;

		let closeBtn = this.titlebar.querySelector("div.title-bar-controls > button[aria-label='Close']") as HTMLButtonElement;
		if (closeBtn) {
			this.closeBtn = closeBtn;
			closeBtn.addEventListener('click', () => {
				this.hide();
			});
		}

		// Register window move handlers
		this.dragging = false;
		switch (this.config.startPosition) {
			case MSWindowStartPosition.TopLeft: {
				this.x = 0;
				this.y = 0;
				break;
			}
			case MSWindowStartPosition.Center: {
				this.x = document.documentElement.clientWidth / 2 - this.config.minWidth / 2;
				this.y = document.documentElement.clientHeight / 2 - this.config.minHeight / 2;
				break;
			}
			default: {
				throw new Error('Invalid start position');
			}
		}
		this.setLoc();

		this.lastTouchX = 0;
		this.lastTouchY = 0;

		this.titlebar.addEventListener('mousedown', () => {
			this.dragging = true;
			document.addEventListener(
				'mouseup',
				() => {
					this.dragging = false;
				},
				{ once: true }
			);
		});

		this.titlebar.addEventListener('touchstart', (e) => {
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

		this.titlebar.addEventListener('mousedown', () => {
			this.dragging = true;
			document.addEventListener(
				'mouseup',
				() => {
					this.dragging = false;
				},
				{ once: true }
			);
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

	show() {
		this.wnd.classList.remove('d-none');
		this.shown = true;
	}

	hide() {
		this.wnd.classList.add('d-none');
		this.shown = false;
	}

	private setLoc() {
		if (this.x < 0) this.x = 0;
		if (this.y < 0) this.y = 0;
		if (this.x > document.documentElement.clientWidth - this.config.minWidth) this.x = document.documentElement.clientWidth - this.config.minWidth;
		if (this.y > document.documentElement.clientHeight - this.config.minHeight) this.y = document.documentElement.clientHeight - this.config.minHeight;
		this.wnd.style.top = this.y + 'px';
		this.wnd.style.left = this.x + 'px';
	}
}
