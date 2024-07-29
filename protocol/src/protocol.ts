export * from './admin.js';

export enum MSAgentProtocolMessageType {
	// Client-to-server
	KeepAlive = 'nop',
	Join = 'join',
	Talk = 'talk',
	PlayAnimation = 'anim',
	SendImage = 'img',
	Admin = 'admin',
	// Server-to-client
	Init = 'init',
	AddUser = 'adduser',
	RemoveUser = 'remuser',
	Chat = 'chat',
	Promote = 'promote',
	Error = 'error'
}

export interface MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType;
}

export interface AgentAnimationConfig {
	join: string[];
	chat: string[];
	idle: string[];
	rest: string[];
	leave: string[];
}

// Client-to-server

export interface MSAgentJoinMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Join;
	data: {
		username: string;
		agent: string;
	};
}

export interface MSAgentTalkMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Talk;
	data: {
		msg: string;
	};
}

export interface MSAgentPlayAnimationMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.PlayAnimation;
	data: {
		anim: string;
	};
}

export interface MSAgentSendImageMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.SendImage;
	data: {
		id: string;
	};
}

// Server-to-client

export interface MSAgentInitMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Init;
	data: {
		username: string;
		agent: string;
		charlimit: number;
		users: {
			username: string;
			agent: string;
			admin: boolean;
			animations: AgentAnimationConfig;
		}[];
	};
}

export interface MSAgentAddUserMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.AddUser;
	data: {
		username: string;
		agent: string;
		animations: AgentAnimationConfig;
	};
}

export interface MSAgentRemoveUserMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.RemoveUser;
	data: {
		username: string;
	};
}

export interface MSAgentChatMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Chat;
	data: {
		username: string;
		message: string;
		audio?: string | undefined;
	};
}

export interface MSAgentAnimationMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.PlayAnimation;
	data: {
		username: string;
		anim: string;
	};
}

export interface MSAgentImageMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.SendImage;
	data: {
		username: string;
		id: string;
	};
}

export interface MSAgentPromoteMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Promote;
	data: {
		username: string;
	};
}

export interface MSAgentErrorMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Error;
	data: {
		error: string;
	};
}
