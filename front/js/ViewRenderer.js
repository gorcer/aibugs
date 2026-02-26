export class ViewRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    renderGrid(viewMap) {
        if (!viewMap || viewMap.length === 0) {
            this.container.innerHTML = 'Нет данных о зрении';
            return;
        }

        this.container.innerHTML = '';
        const minX = Math.min(...viewMap.map(c => c.x));
        const maxX = Math.max(...viewMap.map(c => c.x));
        const minY = Math.min(...viewMap.map(c => c.y));
        const maxY = Math.max(...viewMap.map(c => c.y));

        const table = document.createElement('table');
        for (let y = minY; y <= maxY; y++) {
            const tr = document.createElement('tr');
            for (let x = minX; x <= maxX; x++) {
                const td = document.createElement('td');
                const cell = viewMap.find(c => c.x === x && c.y === y);
                if (cell) {
                    td.className = `type-${cell.type}`;
                    td.title = `X:${x} Y:${y}`;
                    td.innerText = cell.type === 1 ? 'F' : (cell.type === 2 ? 'B' : '');
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        this.container.appendChild(table);
    }

    renderStatus(containerId, data) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<h4>Ход: ${data.turnN}</h4>`;
        data.feeling.forEach(f => {
            const p = document.createElement('p');
            p.textContent = JSON.stringify(f);
            container.appendChild(p);
        });
    }

    renderMemory(containerId, memory) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        [...memory].reverse().forEach(entry => {
            const item = document.createElement('div');
            item.innerHTML = `<strong>Ход ${entry.turnN}</strong><pre>${JSON.stringify(entry.feeling, null, 2)}</pre>`;
            container.appendChild(item);
        });
    }
}
