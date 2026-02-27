import { ApiService } from './ApiService.js';

class FarmBug {
    constructor(uid, config, api, onLog) {
        this.uid = uid;
        this.config = config;
        this.api = api;
        this.onLog = onLog;
        this.socket = null;
        this.isProcessing = false;
        this.lastTurnN = 0;
        this.logs = [];
        this.totalCost = 0;
        this.connect();
    }

    log(msg) {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.logs.push(line);
        if (this.logs.length > 100) this.logs.shift();
        this.onLog(this.uid, line);
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/?uid=${this.uid}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = async (event) => {
            if (this.isProcessing) return;
            const memory = JSON.parse(event.data);
            const lastState = memory[memory.length - 1];
            if (!lastState || lastState.brainSleeping) return;

            this.lastTurnN = lastState.turnN;
            this.isProcessing = true;
            try {
                await this.getLlmDecision(memory);
            } finally {
                this.isProcessing = false;
            }
        };
    }

    async getLlmDecision(memory, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": this.config.model,
                    "messages": [
                        {"role": "system", "content": this.config.systemPrompt},
                        {"role": "user", "content": `История: ${JSON.stringify(memory)}`}
                    ],
                    "response_format": { "type": "json_object" }
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await response.json();
            if (result.error) throw new Error(result.error.message);

            const cost = result.usage?.cost || 0;
            this.totalCost += cost;

            let content = result.choices[0].message.content;
            content = content.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
            const decision = JSON.parse(content);

            this.log(`Решение: ${decision.reason || 'без описания'} (Cost: $${cost.toFixed(6)})`);

            if (decision.plan && decision.plan.length > 0) {
                await this.api.sendAction(this.uid, {
                    initTourN: this.lastTurnN,
                    actions: decision.plan
                });
            }
        } catch (e) {
            if (e.name === 'AbortError' && retryCount < 1) return this.getLlmDecision(memory, retryCount + 1);
            this.log(`Ошибка: ${e.message}`);
        }
    }

    destroy() {
        if (this.socket) this.socket.close();
    }
}

class FarmController {
    constructor() {
        this.api = new ApiService();
        this.bugs = new Map(); // uid -> FarmBug
        this.init();
    }

    async init() {
        document.getElementById('confirmAdd').addEventListener('click', () => this.addBug());
        setInterval(() => this.refreshList(), 2000);
        this.refreshList();
    }

    async addBug() {
        const config = {
            apiKey: document.getElementById('apiKey').value,
            model: document.getElementById('model').value,
            systemPrompt: document.getElementById('systemPrompt').value
        };
        const bugData = {
            name: document.getElementById('name').value,
            x: parseInt(document.getElementById('x').value),
            y: parseInt(document.getElementById('y').value),
            angle: 0
        };

        try {
            const result = await this.api.addUnit(bugData);
            if (result.error) throw new Error(result.error);
            
            const farmBug = new FarmBug(result.uid, config, this.api, (uid, msg) => console.log(uid, msg));
            this.bugs.set(result.uid, farmBug);
            document.getElementById('addForm').style.display = 'none';
        } catch (e) {
            alert(e.message);
        }
    }

    async refreshList() {
        const data = await this.api.getAllUnits();
        const container = document.getElementById('bugList');
        container.innerHTML = '';

        data.units.forEach(u => {
            const card = document.createElement('div');
            card.className = 'bug-card';
            
            const healthPct = u.current_health;
            const energyPct = Math.min(100, (u.current_energy / u.max_energy) * 100); // Примерная нормализация

            card.innerHTML = `
                <div><strong>${u.name}</strong><br><small>${u.uid.slice(0,8)}</small></div>
                <div>Возраст: ${u.age || '?'}</div>
                <div class="bar-container"><div class="bar health-bar" style="width:${healthPct}%"></div><div class="bar-text">HP: ${healthPct}%</div></div>
                <div class="bar-container"><div class="bar energy-bar" style="width:${energyPct}%"></div><div class="bar-text">EN: ${u.current_energy}</div></div>
                <button class="btn-log" data-uid="${u.uid}">Лог</button>
                <button class="btn-del" data-uid="${u.uid}">Удалить</button>
            `;

            card.querySelector('.btn-log').onclick = () => this.showLog(u.uid);
            card.querySelector('.btn-del').onclick = () => this.deleteBug(u.uid);
            
            container.appendChild(card);
        });
    }

    showLog(uid) {
        const bug = this.bugs.get(uid);
        const content = document.getElementById('logContent');
        content.innerText = bug ? bug.logs.join('\n') : 'Лог пуст или AI не запущен для этого жука в этой сессии';
        document.getElementById('logModal').style.display = 'block';
    }

    async deleteBug(uid) {
        if (confirm('Удалить жука?')) {
            await this.api.deleteUnit(uid);
            const bug = this.bugs.get(uid);
            if (bug) {
                bug.destroy();
                this.bugs.delete(uid);
            }
            this.refreshList();
        }
    }
}

new FarmController();
