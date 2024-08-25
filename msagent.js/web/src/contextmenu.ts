export class ContextMenuItem {
	private element: HTMLLIElement;

	name: string;
	cb: Function;

	constructor(name: string, cb: Function) {
		this.name = name;
		this.cb = cb;
		this.element = document.createElement('li');
		this.element.classList.add('context-menu-item');
		this.element.innerText = name;
		this.element.addEventListener('mousedown', () => this.cb());
	}

	getElement() {
		return this.element;
	}

	setName(name: string) {
		this.name = name;
		this.element.innerText = name;
	}

	setCb(cb: Function) {
		this.cb = cb;
	}
}

export class ContextMenu {
	private element: HTMLDivElement;
	private list: HTMLUListElement;

	private items: Array<ContextMenuItem>;

	constructor(parent: HTMLElement) {
		this.element = document.createElement('div');
		this.list = document.createElement('ul');
		this.element.appendChild(this.list);
		this.items = [];
		this.element.classList.add('context-menu');
		this.element.style.display = 'none';
		this.element.style.position = 'fixed';
		parent.appendChild(this.element);
	}

	show(x: number, y: number) {
		this.element.style.left = x + 'px';
		this.element.style.top = y + 'px';
		document.addEventListener(
			'mousedown',
			() => {
				this.hide();
			},
			{ once: true }
		);
		this.element.style.display = 'block';
	}

	hide() {
		this.element.style.display = 'none';
	}

	addItem(item: ContextMenuItem) {
		this.items.push(item);
		this.list.appendChild(item.getElement());
	}

	removeItem(item: ContextMenuItem) {
		let i = this.items.indexOf(item);
		if (i === -1) return;
		this.items.splice(i, 1);
		item.getElement().remove();
	}

	getItem(name: string) {
		return this.items.find((i) => i.name === name);
	}

	clearItems() {
		this.items.splice(0, this.items.length);
		this.list.replaceChildren();
	}
}
