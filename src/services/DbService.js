const Database = require('better-sqlite3');
const path = require('path');

class DbService {
    constructor() {
        const dbPath = path.join(__dirname, '../../database.sqlite');
        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                api_key TEXT UNIQUE
            )
        `);
    }

    createUser(username, apiKey) {
        const stmt = this.db.prepare('INSERT INTO users (username, api_key) VALUES (?, ?)');
        return stmt.run(username, apiKey);
    }

    getUserByApiKey(apiKey) {
        return this.db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
    }
}

module.exports = new DbService();
