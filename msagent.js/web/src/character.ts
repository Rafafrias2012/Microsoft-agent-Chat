import { agentCharacterParseACS, AcsData, BufferStream } from '@msagent.js/core';
import { Agent } from './agent.js';

// Cache of ACS data per character (for agentCreateCharacterFromUrl)
let acsDataCache = new Map<string, AcsData>();

// Purges the ACS cache.
export function agentPurgeACSCache() {
	acsDataCache.clear();
}

export async function agentCreateCharacterFromUrl(url: string): Promise<Agent> {
	// just return the cache object
	if (acsDataCache.has(url)) {
		return new Agent(acsDataCache.get(url)!);
	} else {
		let res = await fetch(url);
		let data = await res.arrayBuffer();

		let buffer = new Uint8Array(data);
		let acsData = agentCharacterParseACS(new BufferStream(buffer));

		acsDataCache.set(url, acsData);
		return new Agent(acsData);
	}
}
