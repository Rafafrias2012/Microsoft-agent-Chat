import { agentCharacterParseACS, AcsData, BufferStream } from '@msagent.js/core';
import { Agent } from './agent.js';

// Cache of ACS data per character (for agentCreateCharacterFromUrl)
let acsDataCache = new Map<string, AcsData>();

// Purges the ACS cache.
//
// FIXME: A smarter way to do this would probably be instead reference count
// AcsData instances, then when an agent is disposed decrement reference count
// (or leave it at 0). Once it's 0 then a globally running interval can remove
// all keys that have no refcount.
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
