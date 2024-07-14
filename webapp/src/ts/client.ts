import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents';
import {
	MSAgentAddUserMessage,
	MSAgentAdminBanMessage,
	MSAgentAdminGetIPMessage,
	MSAgentAdminGetIPResponse,
	MSAgentAdminKickMessage,
	MSAgentAdminLoginMessage,
	MSAgentAdminLoginResponse,
	MSAgentAdminMessage,
	MSAgentAdminOperation,
	MSAgentChatMessage,
	MSAgentErrorMessage,
	MSAgentImageMessage,
	MSAgentInitMessage,
	MSAgentJoinMessage,
	MSAgentPromoteMessage,
	MSAgentProtocolMessage,
	MSAgentProtocolMessageType,
	MSAgentRemoveUserMessage,
	MSAgentSendImageMessage,
	MSAgentTalkMessage
} from '@msagent-chat/protocol';
import { User } from './user';
import { agentCreateCharacterFromUrl, ContextMenuItem } from '@msagent-chat/msagent.js';

export interface MSAgentClientEvents {
	close: () => void;
	join: () => void;
	adduser: (user: User) => void;
	remuser: (user: User) => void;
	chat: (user: User, msg: string) => void;
}

export interface APIAgentInfo {
	friendlyName: string;
	filename: string;
}

export interface MOTD {
	version: number;
	html: string;
}

export class MSAgentClient {
	private url: string;
	private socket: WebSocket | null;
	private events: Emitter;
	private users: User[];
	private playingAudio: Map<string, HTMLAudioElement> = new Map();
	private charlimit: number = 0;
	private admin: boolean;
	private loginCb: (e: KeyboardEvent) => void;
	private currentMsgId: number = 0;

	private username: string | null = null;
	private agentContainer: HTMLElement;
	private agent: string | null = null;

	constructor(url: string, agentContainer: HTMLElement) {
		this.url = url;
		this.agentContainer = agentContainer;
		this.socket = null;
		this.events = createNanoEvents();
		this.users = [];
		this.admin = false;

		document.addEventListener(
			'keydown',
			(this.loginCb = (e: KeyboardEvent) => {
				if (e.key === 'l' && e.ctrlKey) {
					e.preventDefault();
					let password = window.prompt('Papers, please');
					if (!password) return;
					this.login(password);
				}
			})
		);
	}

	on<E extends keyof MSAgentClientEvents>(event: E, callback: MSAgentClientEvents[E]): Unsubscribe {
		return this.events.on(event, callback);
	}

	async getAgents() {
		let res = await fetch(this.url + '/api/agents');
		return (await res.json()) as APIAgentInfo[];
	}

	async getMotd(): Promise<MOTD> {
		let res = await fetch(this.url + '/api/motd/version');
		let vs = await res.text();
		let version = parseInt(vs);
		if (isNaN(version)) {
			throw new Error('Version was NaN');
		}
		res = await fetch(this.url + '/api/motd/html');
		let html = await res.text();
		return {
			version,
			html
		};
	}

	getUsers() {
		return this.users;
	}

	connect(): Promise<void> {
		return new Promise((res) => {
			let url = new URL(this.url);
			switch (url.protocol) {
				case 'http:':
					url.protocol = 'ws:';
					break;
				case 'https:':
					url.protocol = 'wss:';
					break;
				default:
					throw new Error(`Unknown protocol ${url.protocol}`);
			}
			url.pathname = '/api/socket';
			this.socket = new WebSocket(url);
			this.socket.addEventListener('open', () => res());
			this.socket.addEventListener('message', (e) => {
				if (e.data instanceof Blob || e.data instanceof ArrayBuffer) {
					// server should not send binary
					return;
				}
				this.handleMessage(e.data);
			});
			this.socket.addEventListener('close', () => {
				this.events.emit('close');
				document.removeEventListener('keydown', this.loginCb);
			});
		});
	}

	send(msg: MSAgentProtocolMessage) {
		if (this.socket === null || this.socket.readyState !== this.socket.OPEN) {
			console.error('Tried to send data on a closed or uninitialized socket');
			return;
		}
		let data = JSON.stringify(msg);
		this.socket!.send(data);
	}

	join(username: string, agent: string) {
		if (this.socket === null || this.socket.readyState !== this.socket.OPEN) {
			throw new Error('Tried to join() on a closed or uninitialized socket');
		}
		return new Promise<void>((res) => {
			let msg: MSAgentJoinMessage = {
				op: MSAgentProtocolMessageType.Join,
				data: {
					username,
					agent
				}
			};
			let u = this.on('join', () => {
				u();
				res();
			});
			this.send(msg);
		});
	}

	talk(msg: string) {
		let talkMsg: MSAgentTalkMessage = {
			op: MSAgentProtocolMessageType.Talk,
			data: {
				msg
			}
		};
		this.send(talkMsg);
	}

	async sendImage(img: ArrayBuffer, type: string) {
		// Upload image
		let res = await fetch(this.url + '/api/upload', {
			method: 'PUT',
			body: img,
			headers: {
				'Content-Type': type
			}
		});
		let json = await res.json();
		if (!json.success) {
			throw new Error('Failed to upload image: ' + json.error);
		}
		let id = json.id as string;

		// Send image
		let msg: MSAgentSendImageMessage = {
			op: MSAgentProtocolMessageType.SendImage,
			data: {
				id
			}
		};
		this.send(msg);
	}

	getCharlimit() {
		return this.charlimit;
	}

	setContextMenu(user: User) {
		let ctx = user.agent.getContextMenu();
		ctx.clearItems();
		// Mute
		let _user = user;
		let mute = new ContextMenuItem('Mute', () => {
			if (_user.muted) {
				mute.setName('Mute');
				_user.muted = false;
			} else {
				mute.setName('Unmute');
				_user.muted = true;
				_user.agent.stopSpeaking();
				this.playingAudio.get(_user.username)?.pause();
			}
		});
		ctx.addItem(mute);
		// Admin
		if (this.admin) {
			// Get IP
			let getip = new ContextMenuItem('Get IP', () => {
				let msg: MSAgentAdminGetIPMessage = {
					op: MSAgentProtocolMessageType.Admin,
					data: {
						action: MSAgentAdminOperation.GetIP,
						username: _user.username
					}
				};
				this.send(msg);
			});
			ctx.addItem(getip);
			// Kick
			let kick = new ContextMenuItem('Kick', () => {
				let msg: MSAgentAdminKickMessage = {
					op: MSAgentProtocolMessageType.Admin,
					data: {
						action: MSAgentAdminOperation.Kick,
						username: _user.username
					}
				};
				this.send(msg);
			});
			ctx.addItem(kick);
			// Ban
			let ban = new ContextMenuItem('Ban', () => {
				let msg: MSAgentAdminBanMessage = {
					op: MSAgentProtocolMessageType.Admin,
					data: {
						action: MSAgentAdminOperation.Ban,
						username: _user.username
					}
				};
				this.send(msg);
			});
			ctx.addItem(ban);
		}
	}

	async login(password: string) {
		let msg: MSAgentAdminLoginMessage = {
			op: MSAgentProtocolMessageType.Admin,
			data: {
				action: MSAgentAdminOperation.Login,
				password
			}
		};
		await this.send(msg);
	}

	private async handleMessage(data: string) {
		let msg: MSAgentProtocolMessage;
		try {
			msg = JSON.parse(data);
		} catch (e) {
			console.error(`Failed to parse message from server: ${(e as Error).message}`);
			return;
		}
		switch (msg.op) {
			case MSAgentProtocolMessageType.KeepAlive: {
				this.send({
					op: MSAgentProtocolMessageType.KeepAlive
				});
				break;
			}
			case MSAgentProtocolMessageType.Init: {
				let initMsg = msg as MSAgentInitMessage;
				this.username = initMsg.data.username;
				this.agent = initMsg.data.agent;
				this.charlimit = initMsg.data.charlimit;
				for (let _user of initMsg.data.users) {
					let agent = await agentCreateCharacterFromUrl(this.url + '/api/agents/' + _user.agent);
					agent.setUsername(_user.username, _user.admin ? '#FF0000' : '#000000');
					agent.addToDom(this.agentContainer);
					agent.show();
					let user = new User(_user.username, agent);
					this.setContextMenu(user);
					this.users.push(user);
				}
				this.events.emit('join');
				break;
			}
			case MSAgentProtocolMessageType.AddUser: {
				let addUserMsg = msg as MSAgentAddUserMessage;
				let agent = await agentCreateCharacterFromUrl(this.url + '/api/agents/' + addUserMsg.data.agent);
				agent.setUsername(addUserMsg.data.username, '#000000');
				agent.addToDom(this.agentContainer);
				agent.show();
				let user = new User(addUserMsg.data.username, agent);
				this.setContextMenu(user);
				this.users.push(user);
				this.events.emit('adduser', user);
				break;
			}
			case MSAgentProtocolMessageType.RemoveUser: {
				let remUserMsg = msg as MSAgentRemoveUserMessage;
				let user = this.users.find((u) => u.username === remUserMsg.data.username);
				if (!user) return;
				user.agent.hide(true);
				if (this.playingAudio.has(user!.username)) {
					this.playingAudio.get(user!.username)?.pause();
					this.playingAudio.delete(user!.username);
				}
				this.users.splice(this.users.indexOf(user), 1);
				this.events.emit('remuser', user);
				break;
			}
			case MSAgentProtocolMessageType.Chat: {
				let chatMsg = msg as MSAgentChatMessage;
				let user = this.users.find((u) => u.username === chatMsg.data.username);
				if (user?.muted) return;

				this.events.emit('chat', user, chatMsg.data.message);
				if (chatMsg.data.audio !== undefined) {
					let audio = new Audio(this.url + chatMsg.data.audio);
					if (this.playingAudio.has(user!.username)) {
						this.playingAudio.get(user!.username)?.pause();
						this.playingAudio.delete(user!.username);
					}

					this.playingAudio.set(user!.username, audio);

					let msgId = ++this.currentMsgId;

					audio.addEventListener('ended', () => {
						// give a bit of time before the wordballoon disappears
						setTimeout(() => {
							if (this.currentMsgId === msgId) {
								user!.agent.stopSpeaking();
								this.playingAudio.delete(user!.username);
							}
						}, 1000);
					});

					user?.agent.speak(chatMsg.data.message);
					audio.play();
				}
				break;
			}
			case MSAgentProtocolMessageType.SendImage: {
				let imgMsg = msg as MSAgentImageMessage;
				let user = this.users.find((u) => u.username === imgMsg.data.username);
				if (!user || user.muted) return;
				let img = new Image();
				let msgId = ++this.currentMsgId;
				img.addEventListener('load', () => {
					this.playingAudio.get(user.username)?.pause();
					user.agent.speakImage(img);
					setTimeout(() => {
						if (this.currentMsgId === msgId) {
							user.agent.stopSpeaking();
						}
					}, 5000);
				});
				img.src = `${this.url}/api/image/${imgMsg.data.id}`;
				break;
			}
			case MSAgentProtocolMessageType.Admin: {
				let adminMsg = msg as MSAgentAdminMessage;
				switch (adminMsg.data.action) {
					case MSAgentAdminOperation.Login: {
						let loginMsg = adminMsg as MSAgentAdminLoginResponse;
						if (loginMsg.data.success) {
							this.admin = true;
							for (const user of this.users) this.setContextMenu(user);
						} else {
							alert('Incorrect password!');
						}
						break;
					}
					case MSAgentAdminOperation.GetIP: {
						let ipMsg = adminMsg as MSAgentAdminGetIPResponse;
						alert(`${ipMsg.data.username} - ${ipMsg.data.ip}`);
						break;
					}
				}
				break;
			}
			case MSAgentProtocolMessageType.Promote: {
				let promoteMsg = msg as MSAgentPromoteMessage;
				let user = this.users.find((u) => u.username === promoteMsg.data.username);
				if (!user) return;
				user.admin = true;
				user.agent.setUsername(user.username, '#ff0000');
				break;
			}
			case MSAgentProtocolMessageType.Error: {
				let errorMsg = msg as MSAgentErrorMessage;
				// TODO: This should be shown as part of the logon window
				window.alert(errorMsg.data.error);
				break;
			}
		}
	}
}
