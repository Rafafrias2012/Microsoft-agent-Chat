import { MSAgentClient } from "./client.js";

export function InitCommands() {

}

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
    }
}