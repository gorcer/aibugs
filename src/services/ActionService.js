const world = require('../models/World');
const Food = require('../models/Food');

class ActionService {
    /**
     * Добавляет действие в очередь жука
     */
    addAction(bug, initTurnN, actionId, payload = {}) {
        if (bug.lastActionTurn === initTurnN) {
            throw new Error('Action already planned for this turn');
        }

        const action = {
            initTurnN,
            actionId,
            payload,
            status: 'pending',
            progress: 0
        };
        bug.actionQueue.push(action);
        bug.lastActionTurn = initTurnN;
    }

    /**
     * Обрабатывает текущие действия всех жуков
     */
    processAllActions() {
        world.bugs.forEach(bug => {
            if (!bug.is_live || bug.actionQueue.length === 0) return;

            const action = bug.actionQueue[0];
            this.executeAction(bug, action);
        });
    }

    executeAction(bug, action) {
        const isLowEnergy = (bug.current_energy / bug.max_energy) * 100 <= bug.energy_low_amount;
        const speedMultiplier = isLowEnergy ? bug.speed_multiply_on_low_energy : 1;

        switch (action.actionId) {
            case 1: // move
                this.handleMove(bug, action, speedMultiplier);
                break;
            case 2: // rotate
                this.handleRotate(bug, action, speedMultiplier);
                break;
            case 3: // bite
                this.handleBite(bug, action);
                break;
        }
    }

    handleMove(bug, action, multiplier) {
        const cost = bug.energy_consumption_per_cell;
        if (bug.current_energy < cost) {
            bug.actionQueue.shift();
            return;
        }

        // Расчет перемещения (упрощенно: 1 клетка за ход с учетом множителя)
        let nextX = bug.x;
        let nextY = bug.y;

        if (bug.angle === 0) nextX++;
        else if (bug.angle === 90) nextY++;
        else if (bug.angle === 180) nextX--;
        else if (bug.angle === 270) nextY--;

        if (world.isCellEmpty(nextX, nextY)) {
            world.grid[bug.x][bug.y] = null;
            bug.x = nextX;
            bug.y = nextY;
            world.grid[bug.x][bug.y] = bug;
            bug.current_energy -= cost;
        }
        
        bug.actionQueue.shift();
    }

    handleRotate(bug, action, multiplier) {
        const targetRotation = action.payload.angle || 90; // +90 или -90
        const cost = Math.abs(targetRotation) * bug.energy_consumption_per_degree;
        
        bug.angle = (bug.angle + targetRotation + 360) % 360;
        bug.current_energy -= cost;
        bug.actionQueue.shift();
    }

    handleBite(bug, action) {
        console.log(`Bug ${bug.name} is biting at angle ${bug.angle}`);
        let targetX = bug.x;
        let targetY = bug.y;

        if (bug.angle === 0) targetX++;
        else if (bug.angle === 90) targetY++;
        else if (bug.angle === 180) targetX--;
        else if (bug.angle === 270) targetY--;

        const target = world.grid[targetX] ? world.grid[targetX][targetY] : null;

        if (target instanceof Food) {
            const amount = Math.min(target.amount, bug.feed_speed);
            target.amount -= amount;
            bug.current_energy = Math.min(bug.max_energy, bug.current_energy + amount);
            if (target.amount <= 0) world.grid[targetX][targetY] = null;
        } else if (target && target.constructor.name === 'Bug') {
            const damage = bug.attack * bug.feed_speed;
            console.log(`Biting another bug ${target.name}. Damage: ${damage}`);
            target.current_health -= damage;
            target.weight -= damage;
            bug.current_energy = Math.min(bug.max_energy, bug.current_energy + damage);
            
            // Запись боли в память цели
            const relativeAngle = (bug.angle - target.angle + 180 + 360) % 360;
            target.lastPainAngle = relativeAngle;
        }
        
        bug.actionQueue.shift();
    }
}

module.exports = new ActionService();
