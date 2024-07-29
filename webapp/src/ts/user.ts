import { Agent } from '@msagent-chat/msagent.js';
import { AgentAnimationConfig } from '@msagent-chat/protocol';

export class User {
	username: string;
	agent: Agent;
	muted: boolean;
	admin: boolean;
	msgId: number = 0;
	animations: AgentAnimationConfig;

	constructor(username: string, agent: Agent, animations: AgentAnimationConfig) {
		this.username = username;
		this.agent = agent;
		this.muted = false;
		this.admin = false;
		this.animations = animations;
	}

	async doAnim(action: string) {
		// @ts-ignore
		for (let anim of this.animations[action]) {
			await this.agent.playAnimationByNamePromise(anim);
		}
	}
}
