export class ViewRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    renderWorldMap(units, onUnitClick) {
        if (!units || units.length === 0) {
            document.getElementById('worldMapContainer').innerHTML = 'Мир пуст';
            return;
        }

        const container = document.getElementById('worldMapContainer');
        container.innerHTML = '';

        const minX = Math.min(...units.map(u => u.x), 0);
        const maxX = Math.max(...units.map(u => u.x), 20);
        const minY = Math.min(...units.map(u => u.y), 0);
        const maxY = Math.max(...units.map(u => u.y), 20);

        const table = document.createElement('table');
        for (let y = minY; y <= maxY; y++) {
            const tr = document.createElement('tr');
            for (let x = minX; x <= maxX; x++) {
                const td = document.createElement('td');
                const unit = units.find(u => u.x === x && u.y === y);
                if (unit) {
                    td.className = 'type-2';
                    td.style.cursor = 'pointer';
                    
                    // Отображение направления стрелкой
                    let arrow = '→';
                    if (unit.angle === 90) arrow = '↓';
                    else if (unit.angle === 180) arrow = '←';
                    else if (unit.angle === 270) arrow = '↑';
                    
                    td.innerText = arrow;
                    td.title = `${unit.name} (HP: ${unit.current_health}, Angle: ${unit.angle})`;
                    td.onclick = () => onUnitClick(unit.uid);
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        container.appendChild(table);
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
