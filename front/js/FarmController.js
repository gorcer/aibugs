import { ApiService } from './ApiService.js';
import { ViewRenderer } from './ViewRenderer.js';

class FarmBug {
    constructor(uid, config, api, onLog) {
        this.uid = uid;
        this.config = config;
        this.api = api;
        this.onLog = onLog;
        this.socket = null;
        this.isProcessing = false;
        this.lastTurnN = 0;
        this.lastMemory = null;
        this.experience = null;
        this.mood = null;
        this.logs = [];
        this.totalCost = 0;
        this.responseTimes = [];
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
            const memory = JSON.parse(event.data);
            const lastState = memory[memory.length - 1];
            if (!lastState) return;
            
            this.lastMemory = lastState;

            if (this.isProcessing || lastState.brainSleeping) return;

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
        const startTime = Date.now();
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
                        {"role": "user", "content": `Твой текущий опыт: ${this.experience || 'пока отсутствует'}\n\nИстория последних ходов: ${JSON.stringify(memory)}`}
                    ],
                    "response_format": { "type": "json_object" }
                }),
                signal: controller.signal
            });

            const result = await Promise.race([
                response.json(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout reading response')), 25000)
                )
            ]);
            clearTimeout(timeoutId);
            if (result.error) throw new Error(result.error.message);

            const duration = Date.now() - startTime;
            this.responseTimes.push(duration);
            if (this.responseTimes.length > 50) this.responseTimes.shift();

            const cost = result.usage?.cost || 0;
            this.totalCost += cost;

            let content = result.choices[0].message.content;
            content = content.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
            const decision = JSON.parse(content);

            if (decision.experience) {
                this.experience = decision.experience;
            }
            if (decision.mood) {
                this.mood = decision.mood;
            }

            this.log(`Решение: ${decision.reason || 'без описания'} (Cost: $${cost.toFixed(6)})`);

            if (decision.plan && decision.plan.length > 0) {
                await this.api.sendAction(this.uid, {
                    initTourN: this.lastTurnN,
                    actions: decision.plan
                });
            }
        } catch (e) {
            if ((e.name === 'AbortError' || e.message === 'Timeout reading response') && retryCount < 4) {
                this.log(`Таймаут. Повторная попытка ${retryCount + 2}/5...`);
                return this.getLlmDecision(memory, retryCount + 1);
            }
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
        this.renderer = new ViewRenderer('worldMapContainer');
        this.bugs = new Map(); // uid -> FarmBug
        this.init();
    }

    async init() {
        document.getElementById('confirmAdd').addEventListener('click', () => this.addBug());
        document.getElementById('model').addEventListener('input', (e) => {
            document.getElementById('name').value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        });
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
        
        // Собираем планы всех активных жуков
        const allPlans = {};
        data.units.forEach(u => {
            const bug = this.bugs.get(u.uid);
            if (bug && bug.lastMemory && bug.lastMemory.feeling) {
                const planData = bug.lastMemory.feeling.find(f => f.currentPlan);
                if (planData && planData.currentPlan.length > 0) {
                    allPlans[u.uid] = this.calculatePlanPath(u.x, u.y, u.angle, planData.currentPlan);
                }
            }
        });

        // Отрисовка карты
        this.renderer.renderWorldMap(
            data.units, 
            data.food, 
            (uid) => this.showLog(uid),
            (x, y) => {
                document.getElementById('addForm').style.display = 'block';
                document.getElementById('x').value = x;
                document.getElementById('y').value = y;
            },
            (food) => console.log('Food:', food),
            allPlans
        );

        const container = document.getElementById('bugList');
        container.innerHTML = '';

        data.units.forEach(u => {
            const card = document.createElement('div');
            card.className = 'bug-card';
            
            const healthPct = u.current_health;
            const energyPct = Math.min(u.current_energy , 100); // Упрощенная нормализация
            const color = this.renderer.getUnitColor(u.uid);
            
            const bug = this.bugs.get(u.uid);
            let avgTime = '0';
            if (bug && bug.responseTimes.length > 0) {
                const sum = bug.responseTimes.reduce((a, b) => a + b, 0);
                avgTime = (sum / bug.responseTimes.length / 1000).toFixed(2);
            }

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 15px; height: 15px; border-radius: 50%; background: ${color}; border: 1px solid #999;"></div>
                    <div><strong>${u.name} ${bug?.mood || ''}</strong><br><small>LLM: ${avgTime}s</small></div>
                </div>
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
        const logContent = document.getElementById('logContent');
        const expContent = document.getElementById('experienceContent');
        
        logContent.innerText = bug ? bug.logs.join('\n') : 'Лог пуст или AI не запущен для этого жука в этой сессии';
        expContent.innerText = (bug && bug.experience) ? bug.experience : 'Пока нет накопленного опыта...';
        
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

    calculatePlanPath(startX, startY, startAngle, plan) {
        const path = [];
        let curX = startX;
        let curY = startY;
        let curAngle = startAngle;

        plan.forEach(step => {
            if (step.actionId === 1) { // MOVE
                if (curAngle === 0) curX++;
                else if (curAngle === 90) curY++;
                else if (curAngle === 180) curX--;
                else if (curAngle === 270) curY--;
                path.push({ x: curX, y: curY, type: 'move' });
            } else if (step.actionId === 2) { // ROTATE
                const rotate = step.payload?.angle || 90;
                curAngle = (curAngle + rotate + 360) % 360;
            } else if (step.actionId === 3) { // BITE
                let bx = curX, by = curY;
                if (curAngle === 0) bx++;
                else if (curAngle === 90) by++;
                else if (curAngle === 180) bx--;
                else if (curAngle === 270) by--;
                path.push({ x: bx, y: by, type: 'bite' });
            }
        });
        return path;
    }
}

new FarmController();
