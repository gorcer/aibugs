import { ApiService } from './ApiService.js';
import { ViewRenderer } from './ViewRenderer.js';

class App {
    constructor() {
        this.api = new ApiService();
        this.renderer = new ViewRenderer('gridContainer');
        this.currentUid = null;
        this.lastTurnN = 0;

        this.initEventListeners();
        this.startWorldPolling();
    }

    startWorldPolling() {
        setInterval(() => this.refreshWorldMap(), 2000);
        this.refreshWorldMap();
    }

    async refreshWorldMap() {
        try {
            const data = await this.api.getAllUnits();
            this.renderer.renderWorldMap(data.units, (uid) => this.selectUnit(uid));
        } catch (e) {
            console.error('World map error', e);
        }
    }

    selectUnit(uid) {
        this.currentUid = uid;
        document.getElementById('currentUid').innerText = uid;
        this.refreshData();
    }

    initEventListeners() {
        document.getElementById('addUnitBtn').addEventListener('click', () => this.addUnit());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        
        document.getElementById('moveBtn').addEventListener('click', () => this.sendAction(1));
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.sendAction(2, { angle: -90 }));
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.sendAction(2, { angle: 90 }));
        document.getElementById('biteBtn').addEventListener('click', () => this.sendAction(3));
    }

    async addUnit() {
        const data = {
            name: document.getElementById('name').value,
            x: parseInt(document.getElementById('x').value),
            y: parseInt(document.getElementById('y').value),
            angle: parseInt(document.getElementById('angle').value)
        };

        const result = await this.api.addUnit(data);
        if (result.uid) {
            this.currentUid = result.uid;
            document.getElementById('currentUid').innerText = this.currentUid;
            this.refreshData();
        }
    }

    async refreshData() {
        if (!this.currentUid) return;

        try {
            const [watchData, feelData, memData, unitsData] = await Promise.all([
                this.api.getWatch(this.currentUid),
                this.api.getFeel(this.currentUid),
                this.api.getMemory(this.currentUid),
                this.api.getAllUnits()
            ]);

            const currentUnit = unitsData.units.find(u => u.uid === this.currentUid);

            this.lastTurnN = feelData.turnN;
            this.renderer.renderStatus('status', feelData);
            this.renderer.renderGrid(watchData.viewMap);
            this.renderer.renderUnitParams('unitParams', currentUnit);
            this.renderer.renderMemory('memoryLog', memData.memory);
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
        }
    }

    async sendAction(actionId, payload = {}) {
        if (!this.currentUid) return alert('Сначала создайте жука');

        try {
            const result = await this.api.sendAction(this.currentUid, {
                initTourN: this.lastTurnN,
                actionId,
                payload
            });
            console.log('Action queued:', result);
            // Автоматически обновляем данные через небольшую паузу, 
            // чтобы сервер успел обработать ход (в реальности зависит от тика движка)
            setTimeout(() => this.refreshData(), 500);
        } catch (error) {
            alert('Ошибка отправки действия: ' + error.message);
        }
    }
}

new App();
