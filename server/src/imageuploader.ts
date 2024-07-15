import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fileTypeFromBuffer } from 'file-type';
import * as crypto from 'crypto';
import Sharp from 'sharp';
import { ImagesConfig } from './config';

export interface image {
	img: Buffer;
	mime: string;
	timeout: NodeJS.Timeout;
}

const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function randomString(length: number): Promise<string> {
	return new Promise((res, rej) => {
		let _len = length;
		if (_len % 2 !== 0) _len++;
		crypto.randomBytes(_len / 2, (err, buf) => {
			if (err) {
				rej(err);
				return;
			}
			let out = buf.toString('hex');
			if (out.length !== length) out = out.substring(0, length);
			res(out);
		});
	});
}

export class ImageUploader {
	private images: Map<string, image> = new Map();
	private config: ImagesConfig;

	constructor(app: FastifyInstance, config: ImagesConfig) {
		this.config = config;
		for (let type of allowedTypes) {
			// i kinda hate this
			app.addContentTypeParser(type, { parseAs: 'buffer' }, (req, body, done) => done(null, body));
		}
		app.put('/api/upload', async (req, res) => await this.handleRequest(req, res));
		app.get('/api/image/:id', (req, res) => this.handleGet(req, res));
	}

	private handleGet(req: FastifyRequest, res: FastifyReply) {
		let { id } = req.params as { id: string };
		let img = this.images.get(id);
		if (!img) {
			res.status(404);
			return { success: false, error: 'Image not found' };
		}
		res.header('Content-Type', img.mime);
		return img.img;
	}

	private async handleRequest(req: FastifyRequest, res: FastifyReply) {
		let contentType;
		if ((contentType = req.headers['content-type']) === undefined || !allowedTypes.includes(contentType)) {
			res.status(400);
			return { success: false, error: 'Invalid Content-Type' };
		}

		let data = req.body as Buffer;

		// Check MIME
		let mime = await fileTypeFromBuffer(data);

		if (mime?.mime !== contentType) {
			res.status(400);
			return { success: false, error: 'Image is corrupt' };
		}

		// Parse and resize if necessary

		let sharp, meta;
		try {
			sharp = Sharp(data);
			meta = await sharp.metadata();
		} catch {
			res.status(400);
			return { success: false, error: 'Image is corrupt' };
		}

		if (!meta.width || !meta.height) {
			res.status(400);
			return { success: false, error: 'Image is corrupt' };
		}

		if (meta.width > this.config.maxSize.width || meta.height > this.config.maxSize.height) {
			sharp.resize(this.config.maxSize.width, this.config.maxSize.height, { fit: 'inside' });
		}

		let outputImg = await sharp.toBuffer();

		// Add to the map
		let id;
		do {
			id = await randomString(16);
		} while (this.images.has(id));

		let timeout = setTimeout(() => {
			this.images.delete(id);
		}, this.config.expirySeconds * 1000);
		this.images.set(id, { img: outputImg, mime: mime.mime, timeout });
		return { success: true, id };
	}

	has(id: string) {
		return this.images.has(id);
	}
}
