import Fastify, { FastifyInstance } from 'fastify';
import FastifyWS from '@fastify/websocket';
import FastifyStatic from '@fastify/static';
import FastifyCors from '@fastify/cors';
import { Client } from './client.js';
import { MSAgentChatRoom } from './room.js';
import * as toml from 'toml';
import { IConfig } from './config.js';
import * as fs from 'fs';
import { TTSClient } from './tts.js';
import path from 'path';
import { isIP } from 'net';
import { Database } from './database.js';
import { MSAgentErrorMessage, MSAgentProtocolMessageType } from '@msagent-chat/protocol';
import { DiscordLogger } from './discord.js';
import { ImageUploader } from './imageuploader.js';
import pino from 'pino';

let rootLogger = pino({
	name: 'MSAgentChat'
});

let config: IConfig;
let configPath: string;
if (process.argv.length < 3) configPath = './config.toml';
else configPath = process.argv[2];

if (!fs.existsSync(configPath)) {
	rootLogger.error(`${configPath} not found. Please copy config.example.toml and fill out fields.`);
	process.exit(1);
}

try {
	let configRaw = fs.readFileSync(configPath, 'utf-8');
	config = toml.parse(configRaw);
} catch (e) {
	rootLogger.error(`Failed to read or parse ${configPath}: ${(e as Error).message}`);
	process.exit(1);
}

let db = new Database(config.mysql);
await db.init();

const app = Fastify({
	logger: rootLogger.child({ module: 'HTTP' }),
	bodyLimit: 20971520,
}) as unknown as FastifyInstance; // fastify please fix your shit

app.register(FastifyCors, {
	origin: config.http.origins,
	methods: ['GET', 'POST', 'PUT']
});

app.register(FastifyWS);

let tts = null;

if (config.tts.enabled) {
	tts = new TTSClient(config.tts, rootLogger.child({module: "TTS"}));
	app.register(FastifyStatic, {
		root: config.tts.tempDir,
		prefix: '/api/tts/',
		decorateReply: false
	});
}

if (!config.chat.agentsDir.endsWith('/')) config.chat.agentsDir += '/';
if (!fs.existsSync(config.chat.agentsDir)) {
	rootLogger.error(`Directory ${config.chat.agentsDir} does not exist.`);
	process.exit(1);
}

for (let agent of config.agents) {
	if (!fs.existsSync(path.join(config.chat.agentsDir, agent.filename))) {
		rootLogger.error(`${agent.filename} does not exist.`);
		process.exit(1);
	}
}

app.register(FastifyStatic, {
	root: path.resolve(config.chat.agentsDir),
	prefix: '/api/agents/',
	decorateReply: true
});

app.get('/api/agents', (req, res) => {
	return config.agents;
});

// MOTD

app.get('/api/motd/version', (req, res) => {
	res.header('Content-Type', 'text/plain');
	return config.motd.version.toString();
});

app.get('/api/motd/html', (req, res) => {
	res.header('Content-Type', 'text/html');
	return config.motd.html;
});

// Discord
let discord = null;
if (config.discord.enabled) {
	discord = new DiscordLogger(config.discord);
}

// Image upload
let img = new ImageUploader(app, config.images);

let primaryRoom = new MSAgentChatRoom(config.chat, rootLogger.child({module: "Room#Default"}), config.agents, db, img, tts, discord);

let rooms = new Map<string, MSAgentChatRoom>();

app.register(async (app) => {
	app.get('/api/socket', { websocket: true }, async (socket, req) => {
		// TODO: Do this pre-upgrade and return the appropriate status codes
		let ip: string;
		if (config.http.proxied) {
			if (req.headers['x-forwarded-for'] === undefined) {
				rootLogger.child({module: "HTTP"}).error(`Warning: X-Forwarded-For not set! This is likely a misconfiguration of your reverse proxy.`);
				socket.close();
				return;
			}
			let xff = req.headers['x-forwarded-for'];
			if (xff instanceof Array) ip = xff[0];
			else ip = xff;
			if (!isIP(ip)) {
				rootLogger.child({module: "HTTP"}).error(`Warning: X-Forwarded-For malformed! This is likely a misconfiguration of your reverse proxy.`);
				socket.close();
				return;
			}
		} else {
			ip = req.ip;
		}
		if (await db.isUserBanned(ip)) {
			let msg: MSAgentErrorMessage = {
				op: MSAgentProtocolMessageType.Error,
				data: {
					error: 'You have been banned.'
				}
			};
			socket.send(JSON.stringify(msg), () => {
				socket.close();
			});
			return;
		}

		let room : MSAgentChatRoom;

		if ((req.query as any).room !== undefined) {
			let requestedRoom = (req.query as any).room;
			if (rooms.has(requestedRoom)) {
				room = rooms.get(requestedRoom)!;
			} else {
				room = new MSAgentChatRoom(config.chat, rootLogger.child({module: `Room#${requestedRoom}`}), config.agents, db, img, tts, null);
				rooms.set(requestedRoom, room);
			}
		} else {
			room = primaryRoom;
		}

		let o = room.clients.filter((c) => c.ip === ip);
		if (o.length >= config.chat.maxConnectionsPerIP) {
			o[0].socket.close();
		}
		let client = new Client(socket, room, ip);
		room.addClient(client);
	});
});

app.listen({ host: config.http.host, port: config.http.port });
