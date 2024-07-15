export interface IConfig {
	http: {
		host: string;
		port: number;
		proxied: boolean;
		origins: string | string[] | boolean;
	};
	mysql: MySQLConfig;
	chat: ChatConfig;
	motd: motdConfig;
	discord: DiscordConfig;
	tts: TTSConfig;
	images: ImagesConfig;
	agents: AgentConfig[];
}

export interface TTSConfig {
	enabled: boolean;
	server: string;
	voice: string;
	tempDir: string;
	transcodeOpus: boolean;
	wavExpirySeconds: number;
}

export interface ChatConfig {
	charlimit: number;
	agentsDir: string;
	maxConnectionsPerIP: number;
	adminPasswordHash: string;
	bannedWords: string[];
	ratelimits: {
		chat: RateLimitConfig;
	};
}

export interface motdConfig {
	version: number;
	html: string;
}

export interface AgentConfig {
	friendlyName: string;
	filename: string;
}

export interface RateLimitConfig {
	seconds: number;
	limit: number;
}

export interface MySQLConfig {
	host: string;
	username: string;
	password: string;
	database: string;
}

export interface DiscordConfig {
	enabled: boolean;
	webhookURL: string;
}

export interface ImagesConfig {
	maxSize: { width: number; height: number };
	expirySeconds: number;
}
