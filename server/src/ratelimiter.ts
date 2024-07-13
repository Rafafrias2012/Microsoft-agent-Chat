import { EventEmitter } from 'node:events';
import { RateLimitConfig } from './config.js';

// Class to ratelimit a resource (chatting, logging in, etc)
export default class RateLimiter extends EventEmitter {
	private limit: number;
	private interval: number;
	private requestCount: number;
	private limiter?: NodeJS.Timeout;
	private limiterSet: boolean;

	constructor(config: RateLimitConfig) {
		super();
		this.limit = config.limit;
		this.interval = config.seconds;
		this.requestCount = 0;
		this.limiterSet = false;
	}
	// Return value is whether or not the action should be continued
	request(): boolean {
		this.requestCount++;
		if (this.requestCount >= this.limit) {
			this.emit('limit');
			return false;
		}
		if (!this.limiterSet) {
			this.limiter = setTimeout(() => {
				this.limiterSet = false;
				this.requestCount = 0;
			}, this.interval * 1000);
			this.limiterSet = true;
		}
		return true;
	}
}