export class ViewRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    renderWorldMap(units, food, onUnitClick, onEmptyClick) {
        const hasUnits = units && units.length > 0;
        const hasFood = food && food.length > 0;

        if (!hasUnits && !hasFood) {
            document.getElementById('worldMapContainer').innerHTML = 'Мир пуст';
            return;
        }

        const container = document.getElementById('worldMapContainer');
        container.innerHTML = '';

        const allObjects = [...(units || []), ...(food || [])];
        const minX = Math.min(...allObjects.map(o => o.x), 0);
        const maxX = Math.max(...allObjects.map(o => o.x), 20);
        const minY = Math.min(...allObjects.map(o => o.y), 0);
        const maxY = Math.max(...allObjects.map(o => o.y), 20);

        const table = document.createElement('table');
        for (let y = minY; y <= maxY; y++) {
            const tr = document.createElement('tr');
            for (let x = minX; x <= maxX; x++) {
                const td = document.createElement('td');
                const unit = units ? units.find(u => u.x === x && u.y === y) : null;
                const foodItem = food ? food.find(f => f.x === x && f.y === y) : null;

                if (unit) {
                    td.className = 'type-2';
                    td.style.cursor = 'pointer';
                    let arrow = '→';
                    if (unit.angle === 90) arrow = '↓';
                    else if (unit.angle === 180) arrow = '←';
                    else if (unit.angle === 270) arrow = '↑';
                    td.innerText = arrow;
                    td.title = `${unit.name} (HP: ${unit.current_health})`;
                    td.onclick = () => onUnitClick(unit.uid);
                } else if (foodItem) {
                    td.className = 'type-1';
                    td.innerText = 'F';
                    td.title = `Food: ${foodItem.amount}`;
                } else {
                    td.style.cursor = 'crosshair';
                    td.onclick = () => onEmptyClick(x, y);
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        container.appendChild(table);
    }

    renderUnitParams(containerId, unit) {
        const container = document.getElementById(containerId);
        if (!unit) {
            container.innerHTML = 'Данные отсутствуют';
            return;
        }

        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        const params = {
            'Имя': unit.name,
            'Координаты': `X: ${unit.x}, Y: ${unit.y}`,
            'Угол': unit.angle,
            'Жив': unit.is_live ? 'Да' : 'Нет',
            'Здоровье': unit.current_health,
            'Энергия': unit.current_energy
        };

        for (const [label, value] of Object.entries(params)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${label}:</strong> ${value}`;
            list.appendChild(li);
        }
        container.innerHTML = '';
        container.appendChild(list);
    }

    renderGrid(viewMap) {
        // Добавляем самого жука в точку (0,0) для визуализации центра
        const cells = [...(viewMap || []), { x: 0, y: 0, type: 'self' }];

        this.container.innerHTML = '';
        const minX = Math.min(...cells.map(c => c.x));
        const maxX = Math.max(...cells.map(c => c.x));
        const minY = Math.min(...cells.map(c => c.y));
        const maxY = Math.max(...cells.map(c => c.y));

        const table = document.createElement('table');
        for (let y = minY; y <= maxY; y++) {
            const tr = document.createElement('tr');
            for (let x = minX; x <= maxX; x++) {
                const td = document.createElement('td');
                const cell = cells.find(c => c.x === x && c.y === y);
                
                if (cell) {
                    if (cell.type === 'self') {
                        td.className = 'current-bug';
                        td.innerText = 'Я';
                    } else {
                        td.className = `type-${cell.type}`;
                        td.innerText = cell.type === 1 ? 'F' : (cell.type === 2 ? 'B' : '');
                    }
                    td.title = `Rel X:${x} Y:${y}`;
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
