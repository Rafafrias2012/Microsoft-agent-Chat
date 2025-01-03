import path from 'path';
import * as fs from 'fs/promises';
import { TTSConfig } from './config.js';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { finished } from 'node:stream/promises';
import ffmpeg from 'fluent-ffmpeg';
import { Logger } from 'pino';

export class TTSClient {
	private config: TTSConfig;
	private deleteOps: Map<string, NodeJS.Timeout>;
	private logger: Logger;

	constructor(config: TTSConfig, logger: Logger) {
		this.config = config;
		if (!this.config.tempDir.endsWith('/')) this.config.tempDir += '/';
		this.deleteOps = new Map();
		this.logger = logger;
	}

	async ensureDirectoryExists() {
		let stat;
		try {
			stat = await fs.stat(this.config.tempDir);
		} catch (e) {
			let error = e as NodeJS.ErrnoException;
			switch (error.code) {
				case 'ENOTDIR': {
					this.logger.warn('File exists at TTS temp directory path. Unlinking...');
					await fs.unlink(this.config.tempDir.substring(0, this.config.tempDir.length - 1));
					// intentional fall-through
				}
				case 'ENOENT': {
					await fs.mkdir(this.config.tempDir, { recursive: true });
					break;
				}
				default: {
					this.logger.error(`Cannot access TTS Temp dir: ${error.message}`);
					process.exit(1);
					break;
				}
			}
		}
	}

	async synthesizeToFile(text: string, id: string): Promise<string> {
		this.ensureDirectoryExists();
		let wavFilename = id + (this.config.transcodeOpus ? '.ogg' : '.wav');
		let wavPath = path.join(this.config.tempDir, wavFilename);
		try {
			await fs.unlink(wavPath);
		} catch {}
		let file = await fs.open(wavPath, fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_WRONLY);
		let stream = file.createWriteStream();
		let res = await fetch(this.config.server + '/api/synthesize', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				voice: this.config.voice
			})
		});
		if (this.config.transcodeOpus) {
			let coder = ffmpeg(Readable.fromWeb(res.body as ReadableStream<any>))
				.audioCodec('opus')
				.outputFormat('ogg');
			await finished(coder.pipe(stream));
		} else {
			await finished(Readable.fromWeb(res.body as ReadableStream<any>).pipe(stream));
		}
		await file.close();
		this.deleteOps.set(
			wavPath,
			setTimeout(async () => {
				await fs.unlink(wavPath);
				this.deleteOps.delete(wavPath);
			}, this.config.wavExpirySeconds * 1000)
		);
		return wavFilename;
	}
}
