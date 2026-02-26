import { ApiService } from './ApiService.js';
import { ViewRenderer } from './ViewRenderer.js';

class App {
    constructor() {
        this.api = new ApiService();
        this.renderer = new ViewRenderer('gridContainer');
        this.currentUid = null;

        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('addUnitBtn').addEventListener('click', () => this.addUnit());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
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
            const [watchData, feelData, memData] = await Promise.all([
                this.api.getWatch(this.currentUid),
                this.api.getFeel(this.currentUid),
                this.api.getMemory(this.currentUid)
            ]);

            this.renderer.renderStatus('status', feelData);
            this.renderer.renderGrid(watchData.viewMap);
            this.renderer.renderMemory('memoryLog', memData.memory);
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
        }
    }
}

new App();
