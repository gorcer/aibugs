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
                password TEXT,
                api_key TEXT UNIQUE
            )
        `);
    }

    createUser(username, password, apiKey) {
        const stmt = this.db.prepare('INSERT INTO users (username, password, api_key) VALUES (?, ?, ?)');
        return stmt.run(username, password, apiKey);
    }

    getUserByApiKey(apiKey) {
        return this.db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
    }

    getUserByUsername(username) {
        return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }
}

module.exports = new DbService();
