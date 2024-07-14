import { MSAgentProtocolMessage, MSAgentProtocolMessageType } from './protocol';

export enum MSAgentAdminOperation {
	// Client-to-server
	Kick = 'kick',
	Ban = 'ban',
	// Bidirectional
	Login = 'login',
	GetIP = 'ip'
}

export interface MSAgentAdminMessage extends MSAgentProtocolMessage {
	op: MSAgentProtocolMessageType.Admin;
	data: {
		action: MSAgentAdminOperation;
	};
}

// Client-to-server

export interface MSAgentAdminLoginMessage extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.Login;
		password: string;
	};
}

export interface MSAgentAdminGetIPMessage extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.GetIP;
		username: string;
	};
}

export interface MSAgentAdminKickMessage extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.Kick;
		username: string;
	};
}

export interface MSAgentAdminBanMessage extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.Ban;
		username: string;
	};
}

// Server-to-client

export interface MSAgentAdminLoginResponse extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.Login;
		success: boolean;
	};
}

export interface MSAgentAdminGetIPResponse extends MSAgentAdminMessage {
	data: {
		action: MSAgentAdminOperation.GetIP;
		username: string;
		ip: string;
	};
}
