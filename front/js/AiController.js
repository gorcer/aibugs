import { ApiService } from './ApiService.js';

class AiController {
    constructor() {
        this.api = new ApiService();
        this.socket = null;
        this.currentUid = null;
        this.lastTurnN = 0;
        this.totalCost = 0;
        
        this.logElement = document.getElementById('log');
        this.startBtn = document.getElementById('startBtn');
        
        this.startBtn.addEventListener('click', () => this.start());
    }

    log(msg) {
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.logElement.appendChild(entry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    async checkModelAvailability() {
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;

        this.log(`Проверка доступности модели ${model}...`);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model,
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 1
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message || "Ошибка проверки модели");
        }
        this.log("Модель доступна.");
        return true;
    }

    async start() {
        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) return alert('Введите API Key');

        this.startBtn.disabled = true;
        this.log('Запуск процесса...');

        try {
            await this.checkModelAvailability();

            const bugData = {
                name: document.getElementById('name').value,
                x: parseInt(document.getElementById('x').value),
                y: parseInt(document.getElementById('y').value),
                angle: 0
            };

            const result = await this.api.addUnit(bugData);
            this.currentUid = result.uid;
            document.getElementById('uid').innerText = this.currentUid;
            document.getElementById('status').innerText = 'Активен';
            document.getElementById('status').className = 'status-active';

            this.connectWebSocket(this.currentUid);
            this.log(`Жук создан. UID: ${this.currentUid}`);
        } catch (e) {
            this.log(`Критическая ошибка: ${e.message}`);
            document.getElementById('status').innerText = 'Ошибка запуска';
            document.getElementById('status').className = '';
            this.startBtn.disabled = false;
        }
    }

    connectWebSocket(uid) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/?uid=${uid}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            this.lastTurnN = data.turnN;
            this.log(`Ход ${data.turnN}. Запрос к LLM...`);
            await this.getLlmDecision(data);
        };
    }

    async getLlmDecision(worldState) {
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;
        const systemPrompt = document.getElementById('systemPrompt').value;

        const userPrompt = `Текущее состояние:
Зрение: ${JSON.stringify(worldState.viewMap)}
Ощущения: ${JSON.stringify(worldState.feeling)}
Твой ход.`;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": model,
                    "messages": [
                        {"role": "system", "content": systemPrompt},
                        {"role": "user", "content": userPrompt}
                    ],
                    "response_format": { "type": "json_object" }
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(`OpenRouter Error: ${result.error.message}`);
            }

            if (result.cost) {
                this.totalCost += result.cost;
                document.getElementById('totalCost').innerText = this.totalCost.toFixed(6);
            }

            const content = result.choices[0].message.content;
            const decision = JSON.parse(content);

            this.log(`LLM решила: ${content} (Cost: $${result.cost || 0})`);

            await this.api.sendAction(this.currentUid, {
                initTourN: this.lastTurnN,
                actionId: decision.actionId,
                payload: decision.payload || {}
            });
        } catch (e) {
            this.log(`Ошибка LLM: ${e.message}`);
        }
    }
}

new AiController();
