export class ViewRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.unitColors = JSON.parse(localStorage.getItem('unitColors') || '{}');
    }

    getUnitColor(uid) {
        if (!this.unitColors[uid]) {
            const hue = Math.floor(Math.random() * 360);
            this.unitColors[uid] = `hsl(${hue}, 70%, 80%)`;
            localStorage.setItem('unitColors', JSON.stringify(this.unitColors));
        }
        return this.unitColors[uid];
    }

    renderWorldMap(units, food, onUnitClick, onEmptyClick, onFoodClick, plans = {}) {
        const hasUnits = units && units.length > 0;
        const hasFood = food && food.length > 0;

        if (!hasUnits && !hasFood) {
            document.getElementById('worldMapContainer').innerHTML = 'World is empty';
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
                
                // Проверка, входит ли клетка в чей-то план
                let planHighlight = null;
                for (const [uid, steps] of Object.entries(plans)) {
                    const step = steps.find(s => s.x === x && s.y === y);
                    if (step) {
                        planHighlight = step;
                        break;
                    }
                }

                if (planHighlight) {
                    td.style.backgroundColor = '#fff9c4'; // Желтый фон для плана
                    if (planHighlight.type === 'bite') {
                        td.innerText = '💢';
                        td.style.fontSize = '10px';
                    }
                }

                if (unit) {
                    td.className = 'type-2';
                    td.style.cursor = 'pointer';
                    td.style.backgroundColor = unit.current_health <= 0 ? '#ccc' : this.getUnitColor(unit.uid);
                    let arrow = '→';
                    if (unit.angle === 90) arrow = '↓';
                    else if (unit.angle === 180) arrow = '←';
                    else if (unit.angle === 270) arrow = '↑';
                    td.innerText = arrow;
                    td.title = `${unit.name} (HP: ${unit.current_health})`;
                    td.onclick = () => onUnitClick(unit.uid);
                } else if (foodItem) {
                    td.className = 'type-1';
                    td.style.backgroundColor = '#90ee90';
                    td.innerText = 'F';
                    td.title = `Food: ${foodItem.amount}`;
                    td.style.cursor = 'pointer';
                    td.onclick = () => onFoodClick(foodItem);
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

    renderFoodParams(containerId, food) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                <li><strong>Type:</strong> Food</li>
                <li><strong>Coordinates:</strong> X: ${food.x}, Y: ${food.y}</li>
                <li><strong>Amount:</strong> ${food.amount}</li>
            </ul>
        `;
    }

    renderUnitParams(containerId, unit) {
        const container = document.getElementById(containerId);
        if (!unit) {
            container.innerHTML = 'No data';
            return;
        }

        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        const params = {
            'Name': unit.name,
            'Coordinates': `X: ${unit.x}, Y: ${unit.y}`,
            'Angle': unit.angle,
            'Alive': unit.is_live ? 'Yes' : 'No',
            'Health': unit.current_health,
            'Energy': unit.current_energy
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
        const cells = [...(viewMap || []), { x: 0, y: 0, type: 'self' }].map(c => ({
            ...c,
            tx: c.y, // Table X
            ty: c.x  // Table Y
        }));

        this.container.innerHTML = '';
        const minX = Math.min(...cells.map(c => c.tx));
        const maxX = Math.max(...cells.map(c => c.tx));
        const minY = Math.min(...cells.map(c => c.ty));
        const maxY = Math.max(...cells.map(c => c.ty));

        const table = document.createElement('table');
        // Внешний цикл по Y (строки), внутренний по X (колонки)
        for (let y = minY; y <= maxY; y++) {
            const tr = document.createElement('tr');
            for (let x = minX; x <= maxX; x++) {
                const td = document.createElement('td');
                const cell = cells.find(c => c.tx === x && c.ty === y);
                
                if (cell) {
                    if (cell.type === 'self') {
                        td.className = 'current-bug';
                        td.innerText = 'Me';
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
        container.innerHTML = `<h4>Turn: ${data.turnN}</h4>`;
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
            item.innerHTML = `<strong>Turn ${entry.turnN}</strong><pre>${JSON.stringify(entry.feeling, null, 2)}</pre>`;
            container.appendChild(item);
        });
    }
}
