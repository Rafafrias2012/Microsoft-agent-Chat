import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents';
import { MSAgentAddUserMessage, MSAgentChatMessage, MSAgentInitMessage, MSAgentJoinMessage, MSAgentProtocolMessage, MSAgentProtocolMessageType, MSAgentRemoveUserMessage, MSAgentTalkMessage } from '@msagent-chat/protocol';
import { User } from './user';

export interface MSAgentClientEvents {
    close: () => void;
    join: () => void;
    adduser: (user: User) => void;
    remuser: (user: User) => void;
    chat: (user: User, msg: string) => void;
}

export class MSAgentClient {
    private url: string;
    private socket: WebSocket | null;
    private events: Emitter;
    private users: User[];
    
    private username: string | null = null;
    private agent: string | null = null;

    constructor(url: string) {
        this.url = url;
        this.socket = null;
        this.events = createNanoEvents();
        this.users = [];
    }

    on<E extends keyof MSAgentClientEvents>(event: E, callback: MSAgentClientEvents[E]): Unsubscribe {
        return this.events.on(event, callback);
    }

    connect(): Promise<void> {
        return new Promise(res => {
            let url = new URL(this.url);
            switch (url.protocol) {
                case "http:":
                    url.protocol = "ws:";
                    break;
                case "https":
                    url.protocol = "wss:";
                    break;
                default:
                    throw new Error(`Unknown protocol ${url.protocol}`);
            }
            url.pathname = "/socket"
            this.socket = new WebSocket(url);
            this.socket.addEventListener('open', () => res());
            this.socket.addEventListener('message', e => {
                if (e.data instanceof ArrayBuffer) {
                    // server should not send binary
                    return;
                }
                this.handleMessage(e.data);
            });
            this.socket.addEventListener('close', () => {
                this.events.emit('close');
            })
        });
    }

    send(msg: MSAgentProtocolMessage) {
        if (this.socket === null || this.socket.readyState !== this.socket.OPEN) {
            console.error("Tried to send data on a closed or uninitialized socket");
            return;
        }
        let data = JSON.stringify(msg);
        this.socket!.send(data);
    }

    join(username: string, agent: string) {
        if (this.socket === null || this.socket.readyState !== this.socket.OPEN) {
            throw new Error("Tried to join() on a closed or uninitialized socket");
        }
        return new Promise<void>(res => {
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

    private handleMessage(data: string) {
        let msg: MSAgentProtocolMessage;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            console.error(`Failed to parse message from server: ${(e as Error).message}`);
            return;
        }
        switch (msg.op) {
            case MSAgentProtocolMessageType.Init: {
                let initMsg = msg as MSAgentInitMessage;
                this.username = initMsg.data.username;
                this.agent = initMsg.data.agent;
                this.users.push(...initMsg.data.users.map(u => new User(u.username, u.agent)));
                this.events.emit('join');
                break;
            }
            case MSAgentProtocolMessageType.AddUser: {
                let addUserMsg = msg as MSAgentAddUserMessage
                let user = new User(addUserMsg.data.username, addUserMsg.data.agent);
                this.events.emit('adduser', user);
                break;
            }
            case MSAgentProtocolMessageType.RemoveUser: {
                let remUserMsg = msg as MSAgentRemoveUserMessage;
                let user = this.users.find(u => u.username === remUserMsg.data.username);
                if (!user) return;
                this.users.splice(this.users.indexOf(user), 1);
                this.events.emit('remuser', user);
                break;
            }
            case MSAgentProtocolMessageType.Chat: {
                let chatMsg = msg as MSAgentChatMessage;
                let user = this.users.find(u => u.username === chatMsg.data.username);
                this.events.emit('chat', user, chatMsg.data.message);
                if (chatMsg.data.audio !== undefined) {
                    let audio = new Audio(this.url + chatMsg.data.audio);
                    audio.play();
                }
                break;
            }
        }
    }
}