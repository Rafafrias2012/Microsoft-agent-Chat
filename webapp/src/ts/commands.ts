import { MSAgentClient } from './client.js';

export function InitCommands() {}

export function RunCommand(command: string, room: MSAgentClient) {
    let arr = command.split(' ');
    let cmd = arr[0];
    let args = arr.slice(1);
    switch (cmd) {
        case '/anim': {
            let anim = args.join(' ');
            room.animation(anim);
            break;
        }
        case '/agent': {
            if (args.length === 0) {
                // If no arguments, show current agent
                console.log(`Current agent: ${room.agent}`);
                return;
            }
            let newAgent = args.join(' ');
            // Change the agent
            room.changeAgent(newAgent);
            break;
        }
    }
}
