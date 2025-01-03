import {
	MSAgentAddUserMessage,
	MSAgentAnimationMessage,
	MSAgentChatMessage,
	MSAgentImageMessage,
	MSAgentInitMessage,
	MSAgentPromoteMessage,
	MSAgentProtocolMessageType,
	MSAgentRemoveUserMessage
} from '@msagent-chat/protocol';
import { Client } from './client.js';
import { TTSClient } from './tts.js';
import { AgentConfig, ChatConfig } from './config.js';
import * as htmlentities from 'html-entities';
import { Database } from './database.js';
import { DiscordLogger } from './discord.js';
import { ImageUploader } from './imageuploader.js';
import { Logger } from 'pino';

export class MSAgentChatRoom {
	agents: AgentConfig[];
	clients: Client[];
	tts: TTSClient | null;
	msgId: number = 0;
	config: ChatConfig;
	db: Database;
	img: ImageUploader;
	discord: DiscordLogger | null;
	private logger: Logger;
	private id: string;

	constructor(id: string, config: ChatConfig, logger: Logger, agents: AgentConfig[], db: Database, img: ImageUploader, tts: TTSClient | null, discord: DiscordLogger | null) {
		this.agents = agents;
		this.clients = [];
		this.config = config;
		this.tts = tts;
		this.db = db;
		this.img = img;
		this.discord = discord;
		this.logger = logger;
		this.id = id;
	}

	addClient(client: Client) {
		this.clients.push(client);
		this.logger.info(`New connection from ${client.ip}`);
		client.on('close', () => {
			if (client.username === null) {
				this.logger.info(`${client.ip} disconnected`);
			} else {
				this.logger.info(`${client.ip} disconnected (${client.username})`);
			}
			this.clients.splice(this.clients.indexOf(client), 1);
			if (client.username === null) return;
			let msg: MSAgentRemoveUserMessage = {
				op: MSAgentProtocolMessageType.RemoveUser,
				data: {
					username: client.username
				}
			};
			for (const _client of this.getActiveClients()) {
				_client.send(msg);
			}
		});
		client.on('join', () => {
			this.logger.info(`${client.ip} joined as ${client.username}`);
			let agent = this.agents.find((a) => a.filename === client.agent)!;
			let initmsg: MSAgentInitMessage = {
				op: MSAgentProtocolMessageType.Init,
				data: {
					username: client.username!,
					agent: client.agent!,
					charlimit: this.config.charlimit,
					users: this.clients
						.filter((c) => c.username !== null)
						.map((c) => {
							return {
								username: c.username!,
								agent: c.agent!,
								admin: c.admin,
								animations: this.agents.find((a) => a.filename === c.agent)!.animations
							};
						})
				}
			};
			client.send(initmsg);
			let msg: MSAgentAddUserMessage = {
				op: MSAgentProtocolMessageType.AddUser,
				data: {
					username: client.username!,
					agent: client.agent!,
					animations: agent.animations
				}
			};
			for (const _client of this.getActiveClients().filter((c) => c !== client)) {
				_client.send(msg);
			}
		});
		client.on('talk', async (message) => {
			message = message.trim();
			if (message.length === 0) return;
			let msg: MSAgentChatMessage = {
				op: MSAgentProtocolMessageType.Chat,
				data: {
					username: client.username!,
					message: message
				}
			};
			if (this.tts !== null) {
				try {
					let filename = await this.tts.synthesizeToFile(message, `${this.id}-${++this.msgId}`);
					msg.data.audio = '/api/tts/' + filename;
				} catch (e) {
					this.logger.error(`Error synthesizing TTS: ${(e as Error).message}`);
				}
			}
			for (const _client of this.getActiveClients()) {
				_client.send(msg);
			}
			this.discord?.logMsg(client.username!, message);
		});
		client.on('animation', async (anim) => {
			let msg: MSAgentAnimationMessage = {
				op: MSAgentProtocolMessageType.PlayAnimation,
				data: {
					username: client.username!,
					anim: anim
				}
			};
			for (const _client of this.getActiveClients()) {
				_client.send(msg);
			}
		});
		client.on('image', async (id) => {
			if (!this.img.has(id)) return;

			let msg: MSAgentImageMessage = {
				op: MSAgentProtocolMessageType.SendImage,
				data: {
					username: client.username!,
					id: id
				}
			};

			for (const _client of this.getActiveClients()) {
				_client.send(msg);
			}
		});
		client.on('admin', () => {
			let msg: MSAgentPromoteMessage = {
				op: MSAgentProtocolMessageType.Promote,
				data: {
					username: client.username!
				}
			};
			for (const _client of this.getActiveClients()) {
				_client.send(msg);
			}
		});
	}

	private getActiveClients() {
		return this.clients.filter((c) => c.username !== null);
	}
}
