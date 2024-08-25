import { BufferStream, SeekDir } from '@msagent.js/core';

import { LOCATION } from '@msagent.js/core';
import { AcsCharacterInfo } from '@msagent.js/core';
import { AcsAnimationEntry } from '@msagent.js/core';
import { AcsImageEntry } from '@msagent.js/core';
import { Agent } from './agent.js';

// Data
export class AcsData {
	characterInfo = new AcsCharacterInfo();
	animInfo: AcsAnimationEntry[] = [];
	images: AcsImageEntry[] = [];
}

// Cache of ACS data per character (for agentCreateCharacterFromUrl)
let acsDataCache = new Map<string, AcsData>();

// Purges the ACS cache.
export function agentPurgeACSCache() {
	acsDataCache.clear();
}

export function agentCharacterParseACS(buffer: BufferStream): AcsData {
	// Make sure the magic is correct for the ACS file.
	if (buffer.readU32LE() != 0xabcdabc3) {
		throw new Error('The provided data buffer does not contain valid ACS data.');
	}

	let acsData = new AcsData();

	// Read the rest of the header.
	let characterInfoLocation = LOCATION.read(buffer);
	let animationInfoLocation = LOCATION.read(buffer);
	let imageInfoLocation = LOCATION.read(buffer);
	let audioInfoLocation = LOCATION.read(buffer);

	buffer.withOffset(characterInfoLocation.offset, () => {
		acsData.characterInfo = AcsCharacterInfo.read(buffer);
	});

	buffer.withOffset(animationInfoLocation.offset, () => {
		acsData.animInfo = buffer.readCountedList(() => {
			return AcsAnimationEntry.read(buffer);
		});
	});

	buffer.withOffset(imageInfoLocation.offset, () => {
		acsData.images = buffer.readCountedList(() => {
			return AcsImageEntry.read(buffer);
		});
	});

	return acsData;
}

export function agentCreateCharacter(data: AcsData): Agent {
	return new Agent(data);
}

export async function agentCreateCharacterFromUrl(url: string): Promise<Agent> {
	// just return the cache object
	if (acsDataCache.has(url)) {
		return agentCreateCharacter(acsDataCache.get(url)!);
	} else {
		let res = await fetch(url);
		let data = await res.arrayBuffer();

		let buffer = new Uint8Array(data);
		let acsData = agentCharacterParseACS(new BufferStream(buffer));

		acsDataCache.set(url, acsData);
		return agentCreateCharacter(acsData);
	}
}
