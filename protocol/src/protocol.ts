export * from './admin.js';

export enum MSAgentProtocolMessageType {
	// Client-to-server
	KeepAlive = 'nop',
	Join = 'join',
	Talk = 'talk',
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
		}[];
	};
}

export interface MSAgentAddUserMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.AddUser;
	data: {
		username: string;
		agent: string;
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
