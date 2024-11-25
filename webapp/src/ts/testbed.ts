// Testbed code
// This will go away when it isn't needed

import * as msagent from '@msagent.js/web';
import * as msagent_core from '@msagent.js/core';

let w = window as any;
w.agents = [];
let input = document.getElementById('testbed-input') as HTMLInputElement;

let mount = document.getElementById('agent-mount') as HTMLDivElement;

input.addEventListener('change', async () => {
	let buffer = await input.files![0].arrayBuffer();

	console.log('Creating agent');
	let agentParsedData = msagent_core.agentCharacterParseACS(new msagent_core.BufferStream(new Uint8Array(buffer)));
	let agent = new msagent.Agent(agentParsedData);

	w.agents.push(agent);

	agent.addToDom(mount);

	agent.show();
	await agent.playAnimationByNamePromise("Show");
	console.log('Agent created');
});

document.addEventListener('DOMContentLoaded', async () => {
	await msagent.agentInit();
	console.log('msagent initalized!');
});

let form = document.getElementById('acsUrlForm') as HTMLFormElement;
form.addEventListener('submit', async (e) => {
	e.preventDefault();
	let url = (document.getElementById('acsUrl') as HTMLInputElement).value;
	let agent = await msagent.agentCreateCharacterFromUrl(url)
	w.agents.push(agent);
	agent.addToDom(document.body);

	agent.show();
	await agent.playAnimationByNamePromise("Show");
	
	console.log(`Loaded agent from ${url}`);
});
