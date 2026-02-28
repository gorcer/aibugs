const world = require('../models/World');
const Food = require('../models/Food');
const ACTIONS = require('../constants/Actions');

class ActionService {
    /**
     * Устанавливает план действий для жука (перезаписывает текущую очередь)
     */
    addAction(bug, initTurnN, actions) {
        if (!Array.isArray(actions)) {
            throw new Error('Actions must be an array');
        }

        if (actions.length > bug.memory_limit) {
            throw new Error(`Too many actions. Max limit is ${bug.memory_limit}`);
        }

        // Перезаписываем очередь новым планом
        bug.actionQueue = actions.map(a => ({
            initTurnN,
            actionId: a.actionId,
            payload: a.payload || {},
            status: 'pending',
            progress: 0
        }));
        
        bug.lastActionTurn = initTurnN;
        // brainSleeping становится true, если в плане больше одного действия
        bug.brainSleeping = bug.actionQueue.length > 1;
    }

    /**
     * Обрабатывает текущие действия всех жуков
     */
    processAllActions() {
        world.bugs.forEach(bug => {
            if (!bug.is_live) return;
            
            if (bug.actionQueue.length === 0) {
                bug.brainSleeping = false;
                return;
            }

            const action = bug.actionQueue[0];
            this.executeAction(bug, action);

            // brainSleeping становится true только если в очереди осталось больше одного действия
            bug.brainSleeping = bug.actionQueue.length > 1;
        });
    }

    executeAction(bug, action) {
        const isLowEnergy = (bug.current_energy / bug.max_energy) * 100 <= bug.energy_low_amount;
        const speedMultiplier = isLowEnergy ? bug.speed_multiply_on_low_energy : 1;

        switch (action.actionId) {
            case ACTIONS.IDLE:
                bug.lastActionResult = { actionId: action.actionId, status: 'OK' };
                bug.actionQueue.shift();
                break;
            case ACTIONS.MOVE:
                this.handleMove(bug, action, speedMultiplier);
                break;
            case ACTIONS.ROTATE:
                this.handleRotate(bug, action, speedMultiplier);
                break;
            case ACTIONS.BITE:
                this.handleBite(bug, action);
                break;
        }
    }

    handleMove(bug, action, multiplier) {
        const cost = bug.energy_consumption_per_cell;
        if (bug.current_energy < cost) {
            bug.actionQueue.shift();
            bug.brainSleeping = false;
            return;
        }

        // Скорость с учетом мультипликатора (клеток за ход)
        const effectiveSpeed = bug.max_speed * multiplier;
        action.progress += effectiveSpeed;

        if (action.progress >= 1) {
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
                bug.current_energy = Math.max(0, bug.current_energy - cost);
                action.status = 'OK';
                bug.lastActionResult = { actionId: action.actionId, status: 'OK' };
                bug.actionQueue.shift();
            } else {
                // Если путь прегражден, действие заканчивается
                action.status = 'Fail';
                bug.lastActionResult = { actionId: action.actionId, status: 'Fail' };
                bug.actionQueue.shift();
                bug.brainSleeping = false;
            }
        }
    }

    handleRotate(bug, action, multiplier) {
        const targetRotation = action.payload.angle || 90; // +90 или -90
        const absRotation = Math.abs(targetRotation);
        const cost = absRotation * bug.energy_consumption_per_degree;
        
        if (bug.current_energy < cost) {
            bug.actionQueue.shift();
            return;
        }

        // Скорость поворота с учетом мультипликатора (градусов за ход)
        const effectiveRotateSpeed = bug.rotate_speed * multiplier;
        action.progress += effectiveRotateSpeed;

        if (action.progress >= absRotation) {
            bug.angle = (bug.angle + targetRotation + 360) % 360;
            bug.current_energy = Math.max(0, bug.current_energy - cost);
            action.status = 'OK';
            bug.lastActionResult = { actionId: action.actionId, status: 'OK' };
            bug.actionQueue.shift();
        }
    }

    handleBite(bug, action) {
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
            bug.lastActionResult = { actionId: action.actionId, status: 'OK' };
        } else if (target && target.uid && target.uid.startsWith('b')) {
            const damage = bug.attack * bug.feed_speed;
            target.current_health -= damage;
            target.weight -= damage;
            
            if (target.is_live && (target.current_health <= 0 || target.weight <= 0)) {
                const gameEngine = require('./GameEngine');
                gameEngine.killBug(target);
            }
            
            bug.current_energy = Math.min(bug.max_energy, bug.current_energy + damage);
            
            // Запись боли в память цели
            const relativeAngle = (bug.angle - target.angle + 180 + 360) % 360;
            target.lastPainAngle = relativeAngle;
            target.brainSleeping = false; // Прерываем сон при укусе
            bug.lastActionResult = { actionId: action.actionId, status: 'OK' };
        } else {
            bug.lastActionResult = { actionId: action.actionId, status: 'Fail' };
            bug.brainSleeping = false;
        }
        
        bug.actionQueue.shift();
    }
}

module.exports = new ActionService();
