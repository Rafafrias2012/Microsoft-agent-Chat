// Testbed code
// This will go away when it isn't needed

import * as msagent from '@msagent.js/web';
let w = window as any;
w.agents = [];
let input = document.getElementById('testbed-input') as HTMLInputElement;

let mount = document.getElementById('agent-mount') as HTMLDivElement;

input.addEventListener('change', async () => {
	let buffer = await input.files![0].arrayBuffer();

	console.log('Creating agent');
	let agent = msagent.agentCreateCharacter(new Uint8Array(buffer));

	w.agents.push(agent);

	agent.addToDom(mount);

	agent.show();
	console.log('Agent created');
});

document.addEventListener('DOMContentLoaded', async () => {
	await msagent.agentInit();
	console.log('msagent initalized!');
});

let form = document.getElementById('acsUrlForm') as HTMLFormElement;
form.addEventListener('submit', (e) => {
	e.preventDefault();
	let url = (document.getElementById('acsUrl') as HTMLInputElement).value;
	msagent.agentCreateCharacterFromUrl(url).then((agent) => {
		w.agents.push(agent);
		agent.addToDom(document.body);
		agent.show();
		console.log(`Loaded agent from ${url}`);
	});
});
