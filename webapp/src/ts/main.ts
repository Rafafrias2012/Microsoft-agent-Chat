import { MSWindow, MSWindowStartPosition } from './MSWindow.js';
import { agentInit } from '@msagent-chat/msagent.js';
import { MSAgentClient } from './client.js';
import { Config } from '../../config.js';
import { RunCommand } from './commands.js';

const elements = {
	motdWindow: document.getElementById('motdWindow') as HTMLDivElement,
	motdContainer: document.getElementById('motdContainer') as HTMLDivElement,
	rulesLink: document.getElementById('rulesLink') as HTMLAnchorElement,

	logonView: document.getElementById('logonView') as HTMLDivElement,
	logonWindow: document.getElementById('logonWindow') as HTMLDivElement,
	logonForm: document.getElementById('logonForm') as HTMLFormElement,
	logonUsername: document.getElementById('logonUsername') as HTMLInputElement,
	logonButton: document.getElementById('logonButton') as HTMLButtonElement,
	agentSelect: document.getElementById('agentSelect') as HTMLSelectElement,

	chatView: document.getElementById('chatView') as HTMLDivElement,
	chatInput: document.getElementById('chatInput') as HTMLInputElement,
	imageUploadBtn: document.getElementById('imageUploadBtn') as HTMLButtonElement,
	chatSendBtn: document.getElementById('chatSendBtn') as HTMLButtonElement,

	roomSettingsWindow: document.getElementById('roomSettingsWindow') as HTMLDivElement,
	animWindow: document.getElementById('animWindow') as HTMLDivElement,
	animSelect: document.getElementById('animSelect') as HTMLSelectElement,
	animPlayBtn: document.getElementById('animPlayBtn') as HTMLButtonElement,
};

let Room: MSAgentClient;

function roomInit() {
	Room = new MSAgentClient(Config.serverAddress, elements.chatView);
	Room.on('close', () => {
		for (let user of Room.getUsers()) {
			user.agent.remove();
		}
		roomInit();
		loggingIn = false;
		elements.logonButton.disabled = false;
		logonWindow.show();
		elements.logonView.style.display = 'block';
		elements.chatView.style.display = 'none';
	});
	Room.on('animwindow', (animations) => {
		elements.animSelect.innerHTML = '';
		for (let anim of animations) {
			let option = document.createElement('option');
			option.innerText = anim;
			option.value = anim;
			elements.animSelect.appendChild(option);
		}
		animWindow.show();
	});
}

let motdWindow = new MSWindow(elements.motdWindow, {
	maxWidth: 600,
	startPosition: MSWindowStartPosition.Center
});

let logonWindow = new MSWindow(elements.logonWindow, {
	minHeight: 275,
	startPosition: MSWindowStartPosition.Center
});

let roomSettingsWindow = new MSWindow(elements.roomSettingsWindow, {
	minWidth: 398,
	minHeight: 442,
	startPosition: MSWindowStartPosition.Center
});

let animWindow = new MSWindow(elements.animWindow, {
	minWidth: 200,
	minHeight: 90,
	startPosition: MSWindowStartPosition.Center
});

elements.animPlayBtn.addEventListener('click', () => {
	Room?.animation(elements.animSelect.value);
});

logonWindow.show();
// roomSettingsWindow.show();

let loggingIn = false;
elements.logonForm.addEventListener('submit', (e) => {
	e.preventDefault();
	localStorage.setItem('MSAUser', elements.logonUsername.value);
	localStorage.setItem('MSAgent', elements.agentSelect.value);
	connectToRoom();
});

elements.chatInput.addEventListener('keypress', (e) => {
	// enter
	if (e.key === 'Enter') talk();
});

elements.chatSendBtn.addEventListener('click', () => {
	talk();
});

async function connectToRoom() {
	if (!elements.agentSelect.value) {
		alert('Please select an agent.');
		return;
	}
	if (loggingIn) return;
	loggingIn = true;
	elements.logonButton.disabled = true;
	await Room.connect();
	await Room.join(elements.logonUsername.value, elements.agentSelect.value);
	elements.chatInput.maxLength = Room.getCharlimit();
	logonWindow.hide();
	elements.logonView.style.display = 'none';
	elements.chatView.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async () => {
	await agentInit();
	elements.logonUsername.value = localStorage.getItem('MSAUser') || '';
	let agents = await Room.getAgents();
	for (const agent of agents) {
		let option = document.createElement('option');
		option.innerText = agent.friendlyName;
		option.value = agent.filename;
		elements.agentSelect.appendChild(option);
	}
	let savedAgent = localStorage.getItem('MSAgent') || '';
	if (agents.some((x) => x.filename === savedAgent)) {
		elements.agentSelect.value = savedAgent;
	}
	let motd = await Room.getMotd();
	elements.motdContainer.innerHTML = motd.html;
	let ver = localStorage.getItem('msagent-chat-motd-version');
	if (!ver || parseInt(ver) !== motd.version) {
		motdWindow.show();
		localStorage.setItem('msagent-chat-motd-version', motd.version.toString());
	}
	elements.rulesLink.addEventListener('click', () => {
		motdWindow.show();
	});
});

function talk() {
	if (Room === null) return;
	let msg = elements.chatInput.value;
	if (msg.startsWith('/')) {
		RunCommand(msg, Room);
	} else {
		Room.talk(msg);
	}
	elements.chatInput.value = '';
}

roomInit();

let imgUploadInput = document.createElement('input');
imgUploadInput.type = 'file';
imgUploadInput.accept = 'image/jpeg,image/png,image/gif,image/webp';

elements.imageUploadBtn.addEventListener('click', () => {
	imgUploadInput.click();
});

document.addEventListener('paste', (e) => {
	if (e.clipboardData?.files.length === 0) return;
	let file = e.clipboardData!.files[0];
	if (!file.type.startsWith('image/')) return;
	if (!window.confirm(`Upload ${file.name} (${Math.round(file.size / 1000)}KB)?`)) return;
	uploadFile(file);
});

imgUploadInput.addEventListener('change', async () => {
	if (!imgUploadInput.files || imgUploadInput.files.length === 0) return;
	uploadFile(imgUploadInput.files[0]);
});

function uploadFile(file: File) {
	let reader = new FileReader();
	reader.onload = async () => {
		let buffer = reader.result as ArrayBuffer;
		await Room?.sendImage(buffer, file.type);
	};
	reader.readAsArrayBuffer(file);
}

let w = window as any;

w.agentchat = {
	getRoom: () => Room
};
