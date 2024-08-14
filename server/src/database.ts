import { isIP } from 'net';
import { MySQLConfig } from './config.js';
import * as mysql from 'mysql2/promise';
import { Address6 } from 'ip-address';

export class Database {
	private config: MySQLConfig;
	private db: mysql.Pool;

	constructor(config: MySQLConfig) {
		this.config = config;
		this.db = mysql.createPool({
			host: this.config.host,
			user: this.config.username,
			password: this.config.password,
			database: this.config.database,
			connectionLimit: 10,
			multipleStatements: false
		});
	}

	async init() {
		let conn = await this.db.getConnection();
		await conn.execute('CREATE TABLE IF NOT EXISTS bans (ip VARCHAR(45) NOT NULL PRIMARY KEY, username TEXT NOT NULL, time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP());');
		conn.release();
	}

	async banUser(ip: string, username: string) {
		let _ip = this.formatIP(ip);
		let conn = await this.db.getConnection();
		await conn.execute('INSERT INTO bans (ip, username) VALUES (?, ?)', [_ip, username]);
		conn.release();
	}

	private formatIP(ip: string) {
		switch (isIP(ip)) {
			case 4:
				// If IPv4, just return as-is
				return ip;
			case 6: {
				// If IPv6, return the /64 equivalent
				let addr = new Address6(ip);
				addr.subnetMask = 64;
				return addr.startAddress().canonicalForm() + '/64';
			}
			case 0:
			default:
				// Invalid IP
				throw new Error('Invalid IP address (what the hell did you even do???)');
		}
	}

	async isUserBanned(ip: string): Promise<boolean> {
		let _ip = this.formatIP(ip);
		let conn = await this.db.getConnection();

		let isBanned = false;

		let res = (await conn.query('SELECT COUNT(ip) AS cnt FROM bans WHERE ip = ?', [_ip])) as mysql.RowDataPacket;
		isBanned = res[0][0]['cnt'] !== 0;

		// compat with old schema
		if (!isBanned && _ip !== ip) {
			let res = (await conn.query('SELECT COUNT(ip) AS cnt FROM bans WHERE ip = ?', [ip])) as mysql.RowDataPacket;
			isBanned = res[0][0]['cnt'] !== 0;
		}

		conn.release();
		return isBanned;
	}
}
