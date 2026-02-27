export class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    async addUnit(data) {
        const res = await fetch(`${this.baseUrl}/addUnit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }

    async getWatch(uid) {
        const res = await fetch(`${this.baseUrl}/watch/${uid}`);
        return res.json();
    }

    async getFeel(uid) {
        const res = await fetch(`${this.baseUrl}/feel/${uid}`);
        return res.json();
    }

    async getMemory(uid) {
        const res = await fetch(`${this.baseUrl}/memory/${uid}`);
        return res.json();
    }

    async getWorldStat() {
        const res = await fetch(`${this.baseUrl}/worldStat`);
        return res.json();
    }

    async sendAction(uid, actionData) {
        const res = await fetch(`${this.baseUrl}/action/${uid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionData)
        });
        return res.json();
    }

    async deleteUnit(uid) {
        const res = await fetch(`${this.baseUrl}/unit/${uid}`, {
            method: 'DELETE'
        });
        return res.json();
    }
}
