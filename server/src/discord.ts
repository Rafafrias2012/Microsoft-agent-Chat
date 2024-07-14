import { WebhookClient } from 'discord.js';
import { DiscordConfig } from './config.js';

export class DiscordLogger {
	private webhook: WebhookClient;

	constructor(config: DiscordConfig) {
		this.webhook = new WebhookClient({ url: config.webhookURL });
	}

	logMsg(username: string, msg: string) {
		this.webhook.send({
			username,
			allowedMentions: {},
			content: msg
		});
	}
}
