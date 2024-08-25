import { BufferStream } from '../buffer';
import { LOCATION, RGNDATA } from './core';

export enum AcsAnimationTransitionType {
	UseReturn = 0x0,
	UseExitBranches = 0x1,
	None = 0x2
}

export enum AcsAnimationOverlayType {
	MouthClosed = 0x0,
	MouthOpenWideShape1 = 0x1,
	MouthOpenWideShape2 = 0x2,
	MouthOpenWideShape3 = 0x3,
	MouthOpenWideShape4 = 0x4,
	MouthOpenMedium = 0x5,
	MouthOpenNarror = 0x6
}

export class AcsFrameImage {
	imageIndex = 0;
	xOffset = 0;
	yOffset = 0;

	static read(buffer: BufferStream) {
		let img = new AcsFrameImage();
		img.imageIndex = buffer.readU32LE();
		img.xOffset = buffer.readU16LE();
		img.yOffset = buffer.readU16LE();
		return img;
	}
}

export class AcsBranchInfo {
	branchFrameIndex = 0;
	branchFrameProbability = 0;

	static read(buffer: BufferStream) {
		let bi = new AcsBranchInfo();
		bi.branchFrameIndex = buffer.readU16LE();
		bi.branchFrameProbability = buffer.readU16LE();
		return bi;
	}
}

export class AcsOverlayInfo {
	overlayType = AcsAnimationOverlayType.MouthClosed;
	replacesTopImage = false;
	overlayImageIndex = 0;

	xOffset = 0;
	yOffset = 0;

	width = 0;
	height = 0;

	regionData: RGNDATA | null = null;

	static read(buffer: BufferStream) {
		let info = new AcsOverlayInfo();
		info.overlayType = buffer.readU8();
		info.replacesTopImage = buffer.readBool();
		info.overlayImageIndex = buffer.readU16LE();

		// Some stuff we read but don't use
		buffer.readU8();
		let regionDataPresent = buffer.readBool();

		info.xOffset = buffer.readS16LE();
		info.yOffset = buffer.readS16LE();

		info.width = buffer.readU16LE();
		info.height = buffer.readU16LE();

		if (regionDataPresent) {
			let regionDataBuffer = buffer.readDataChunkBuffer();
			info.regionData = RGNDATA.read(regionDataBuffer);
		}

		return info;
	}
}

export class AcsAnimationFrameInfo {
	// list type u16
	images: AcsFrameImage[] = [];

	// Currently unused, but this is the sound to play when this frame is played.
	// This is used for sound effects. We could play them pretty easily, since
	// the audio data is just WAV (and browsers support that fine).
	// -1 means no sound should be played.
	soundIndex = 0;

	frameDuration = 0; // The duration of the frame in (1/100)th seconds.
	nextFrame = 0; // -2 = animation has ended (although, I imagine this could be detected in better ways!)

	branchInfo: AcsBranchInfo[] = [];
	overlayInfo: AcsOverlayInfo[] = [];

	static read(buffer: BufferStream) {
		let info = new AcsAnimationFrameInfo();

		info.images = buffer.readCountedList(() => {
			return AcsFrameImage.read(buffer);
		}, BufferStream.prototype.readU16LE);

		info.soundIndex = buffer.readS16LE();
		info.frameDuration = buffer.readU16LE();
		info.nextFrame = buffer.readS16LE();

		info.branchInfo = buffer.readCountedList(() => {
			return AcsBranchInfo.read(buffer);
		}, BufferStream.prototype.readU8);

		info.overlayInfo = buffer.readCountedList(() => {
			return AcsOverlayInfo.read(buffer);
		}, BufferStream.prototype.readU8);

		return info;
	}
}

export class AcsAnimation {
	name = '';
	transitionType = AcsAnimationTransitionType.UseReturn;
	returnName = '';
	frameInfo: AcsAnimationFrameInfo[] = [];

	static read(buffer: BufferStream) {
		let anim = new AcsAnimation();

		anim.name = buffer.readPascalString();
		anim.transitionType = buffer.readU8();
		anim.returnName = buffer.readPascalString();

		anim.frameInfo = buffer.readCountedList(() => {
			return AcsAnimationFrameInfo.read(buffer);
		}, BufferStream.prototype.readU16LE);

		return anim;
	}
}

export class AcsAnimationEntry {
	name = '';
	animationData = new AcsAnimation();

	static read(buffer: BufferStream) {
		let data = new AcsAnimationEntry();
		data.name = buffer.readPascalString();

		// This is part of the in-file data, but for simplicity
		// we read the data here and discard
		let animDataLoc = LOCATION.read(buffer);

		buffer.withOffset(animDataLoc.offset, () => {
			data.animationData = AcsAnimation.read(buffer);
		});
		return data;
	}
}
