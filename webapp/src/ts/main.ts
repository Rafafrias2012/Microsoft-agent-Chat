import { MSWindow, MSWindowStartPosition } from './MSWindow.js';
import { agentInit } from '@msagent-chat/msagent.js';
import { MSAgentClient } from './client.js';
import { Config } from '../../config.js';

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
	chatSendBtn: document.getElementById('chatSendBtn') as HTMLButtonElement,

	roomSettingsWindow: document.getElementById('roomSettingsWindow') as HTMLDivElement
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
}

let motdWindow = new MSWindow(elements.motdWindow, {
	minWidth: 600,
	minHeight: 300,
	maxWidth: 600,
	startPosition: MSWindowStartPosition.Center
});

let logonWindow = new MSWindow(elements.logonWindow, {
	minWidth: 500,
	minHeight: 275,
	startPosition: MSWindowStartPosition.Center
});

let roomSettingsWindow = new MSWindow(elements.roomSettingsWindow, {
	minWidth: 398,
	minHeight: 442,
	startPosition: MSWindowStartPosition.Center
});

logonWindow.show();
// roomSettingsWindow.show();

let loggingIn = false;
elements.logonForm.addEventListener('submit', (e) => {
	e.preventDefault();
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
	for (const agent of await Room.getAgents()) {
		let option = document.createElement('option');
		option.innerText = agent.friendlyName;
		option.value = agent.filename;
		elements.agentSelect.appendChild(option);
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
	Room.talk(elements.chatInput.value);
	elements.chatInput.value = '';
}

roomInit();
