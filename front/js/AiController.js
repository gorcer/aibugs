import { ApiService } from './ApiService.js';

class AiController {
    constructor() {
        this.api = new ApiService();
        this.socket = null;
        this.currentUid = null;
        this.lastTurnN = 0;
        this.totalCost = 0;
        this.isProcessing = false;
        
        this.logElement = document.getElementById('log');
        this.startBtn = document.getElementById('startBtn');
        
        this.startBtn.addEventListener('click', () => this.start());
        document.getElementById('model').addEventListener('input', (e) => {
            document.getElementById('name').value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        });
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
                "max_tokens": 1,
                "response_format": { "type": "json_object" }
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
            if (result.error) {
                throw new Error(result.error);
            }
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
            if (this.isProcessing) {
                console.log('Пропуск хода: предыдущий запрос к LLM еще выполняется');
                return;
            }

            const memory = JSON.parse(event.data);
            const lastState = memory[memory.length - 1];
            if (!lastState) return;

            if (lastState.brainSleeping) {
                console.log(`Ход ${lastState.turnN}: Жук выполняет план (brainSleeping: true). Ждем.`);
                return;
            }

            this.lastTurnN = lastState.turnN;
            this.log(`Ход ${lastState.turnN}. Анализ памяти (${memory.length} зап.). Запрос к LLM...`);
            
            this.isProcessing = true;
            try {
                await this.getLlmDecision(memory);
            } finally {
                this.isProcessing = false;
            }
        };
    }

    async getLlmDecision(memory, retryCount = 0) {
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;
        const systemPrompt = document.getElementById('systemPrompt').value;

        const userPrompt = `История твоей памяти (последние ходы):
${JSON.stringify(memory, null, 2)}

Проанализируй историю и текущее состояние. Твой ход.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Таймаут 30 секунд

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
                }),
                signal: controller.signal
            });

            // Используем Promise.race для таймаута на чтение JSON
            const result = await Promise.race([
                response.json(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout reading response')), 25000)
                )
            ]);
            clearTimeout(timeoutId);
            
            if (result.error) {
                throw new Error(`OpenRouter Error: ${result.error.message}`);
            }

            const cost = result.usage?.cost || result.cost || 0;
            if (cost) {
                this.totalCost += cost;
                document.getElementById('totalCost').innerText = this.totalCost.toFixed(6);
            }

            let content = result.choices[0].message.content;
            
            // Очистка от Markdown блоков ```json ... ```
            // content = content.replace(/```json\n?|```/g, '').trim();
            content = content
                .replace(/^```json\n?/, '')  // Удаляем открывающий тег
                .replace(/\n```$/, '')       // Удаляем закрывающий тег
                .trim();

            const decision = JSON.parse(content);

            this.log(`LLM решила: ${decision.reason || content} (Cost: $${cost.toFixed(6)})`);

            const plan = decision.plan || [];
            if (plan.length === 0) {
                this.log("План пуст: пропуск отправки на бэкенд.");
                return;
            }

            await this.api.sendAction(this.currentUid, {
                initTourN: this.lastTurnN,
                actions: plan
            });
        } catch (e) {
            if (e.name === 'AbortError' || e.message === 'Timeout reading response') {
                this.log(`Ошибка LLM: Превышено время ожидания (Попытка ${retryCount + 1}/5).`);
                if (retryCount < 10) {
                    this.log('Повторная попытка запроса...');
                    return await this.getLlmDecision(memory, retryCount + 1);
                }
            } else {
                this.log(`Ошибка LLM: ${e.message}`);
            }
        }
    }
}

new AiController();
