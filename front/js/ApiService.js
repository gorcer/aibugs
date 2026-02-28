export class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    getApiKey() {
        return localStorage.getItem('apiKey');
    }

    async register(username, password) {
        const res = await fetch(`${this.baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    }

    async login(username, password) {
        const res = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    }

    async addUnit(data) {
        const res = await fetch(`${this.baseUrl}/addUnit`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': this.getApiKey()
            },
            body: JSON.stringify(data)
        });
        return res.json();
    }

    async getWatch(uid) {
        const res = await fetch(`${this.baseUrl}/watch/${uid}`, {
            headers: { 'x-api-key': this.getApiKey() }
        });
        return res.json();
    }

    async getFeel(uid) {
        const res = await fetch(`${this.baseUrl}/feel/${uid}`, {
            headers: { 'x-api-key': this.getApiKey() }
        });
        return res.json();
    }

    async getMemory(uid) {
        const res = await fetch(`${this.baseUrl}/memory/${uid}`, {
            headers: { 'x-api-key': this.getApiKey() }
        });
        return res.json();
    }

    async getWorldStat() {
        const res = await fetch(`${this.baseUrl}/worldStat`, {
            headers: { 'x-api-key': this.getApiKey() }
        });
        return res.json();
    }

    async sendAction(uid, actionData) {
        const res = await fetch(`${this.baseUrl}/action/${uid}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': this.getApiKey()
            },
            body: JSON.stringify(actionData)
        });
        return res.json();
    }

    async deleteUnit(uid) {
        const res = await fetch(`${this.baseUrl}/unit/${uid}`, {
            method: 'DELETE',
            headers: { 'x-api-key': this.getApiKey() }
        });
        return res.json();
    }
}
