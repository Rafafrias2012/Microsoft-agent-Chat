import { MySQLConfig } from './config.js';
import * as mysql from 'mysql2/promise';

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
		let conn = await this.db.getConnection();
		await conn.execute('INSERT INTO bans (ip, username) VALUES (?, ?)', [ip, username]);
		conn.release();
	}

	async isUserBanned(ip: string): Promise<boolean> {
		let conn = await this.db.getConnection();
		let res = (await conn.query('SELECT COUNT(ip) AS cnt FROM bans WHERE ip = ?', [ip])) as mysql.RowDataPacket;
		conn.release();
		return res[0][0]['cnt'] !== 0;
	}
}
