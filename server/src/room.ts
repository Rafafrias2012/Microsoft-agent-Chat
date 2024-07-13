import { MSAgentAddUserMessage, MSAgentChatMessage, MSAgentInitMessage, MSAgentPromoteMessage, MSAgentProtocolMessage, MSAgentProtocolMessageType, MSAgentRemoveUserMessage } from "@msagent-chat/protocol";
import { Client } from "./client.js";
import { TTSClient } from "./tts.js";
import { AgentConfig, ChatConfig } from "./config.js";
import * as htmlentities from 'html-entities';
import { Database } from "./database.js";
import { DiscordLogger } from "./discord.js";

export class MSAgentChatRoom {
    agents: AgentConfig[];
    clients: Client[];
    tts: TTSClient | null;
    msgId : number = 0;
    config: ChatConfig;
    db: Database;
    discord: DiscordLogger | null;

    constructor(config: ChatConfig, agents: AgentConfig[], db: Database, tts: TTSClient | null, discord: DiscordLogger | null) {
        this.agents = agents;
        this.clients = [];
        this.config = config;
        this.tts = tts;
        this.db = db;
        this.discord = discord;
    }

    addClient(client: Client) {
        this.clients.push(client);
        client.on('close', () => {
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
            let initmsg : MSAgentInitMessage = {
                op: MSAgentProtocolMessageType.Init,
                data: {
                    username: client.username!,
                    agent: client.agent!,
                    charlimit: this.config.charlimit,
                    users: this.clients.filter(c => c.username !== null).map(c => {
                        return {
                            username: c.username!,
                            agent: c.agent!,
                            admin: c.admin
                        }
                    })
                }
            };
            client.send(initmsg);
            let msg: MSAgentAddUserMessage = {
                op: MSAgentProtocolMessageType.AddUser,
                data: {
                    username: client.username!,
                    agent: client.agent!
                }
            }
            for (const _client of this.getActiveClients().filter(c => c !== client)) {
                _client.send(msg);
            }
        });
        client.on('talk', async message => {
            let msg: MSAgentChatMessage = {
                op: MSAgentProtocolMessageType.Chat,
                data: {
                    username: client.username!,
                    message: message
                }
            };
            if (this.tts !== null) {
                let filename = await this.tts.synthesizeToFile(message, (++this.msgId).toString(10));
                msg.data.audio = "/api/tts/" + filename;
            }
            for (const _client of this.getActiveClients()) {
                _client.send(msg);
            }
            this.discord?.logMsg(client.username!, message);
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
        return this.clients.filter(c => c.username !== null);
    }
}