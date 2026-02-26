const world = require('../models/World');
const Food = require('../models/Food');
const visionService = require('./VisionService');
const actionService = require('./ActionService');

class GameEngine {
    constructor() {
        this.isRunning = false;
    }

    init() {
        this.spawnInitialFood();
        this.startLoop();
    }

    spawnInitialFood() {
        let currentTotalAmount = 0;
        for (let i = 0; i < world.feedCount; i++) {
            const x = Math.floor(Math.random() * world.width);
            const y = Math.floor(Math.random() * world.height);
            
            if (world.isCellEmpty(x, y)) {
                // Распределяем случайный объем, чтобы не превысить лимит
                const remainingFood = world.feedAmount - currentTotalAmount;
                const amount = i === world.feedCount - 1 ? remainingFood : Math.floor(Math.random() * (remainingFood / (world.feedCount - i)));
                
                const food = new Food(x, y, amount);
                world.food.push(food);
                world.grid[x][y] = food;
                currentTotalAmount += amount;
            }
        }
    }

    startLoop() {
        this.isRunning = true;
        this.tick();
    }

    tick() {
        if (!this.isRunning) return;

        const startTime = Date.now();
        
        // 1. Обработка действий жуков
        this.processActions();

        // 2. Расчет состояния для каждого жука
        const bugsArray = Array.from(world.bugs.values());
        bugsArray.forEach(bug => {
            if (!bug.is_live) return;

            // Потребление энергии за ход
            bug.current_energy -= bug.energy_consumption_per_turn;
            
            // Логика здоровья при низкой/высокой энергии
            const energyPercent = (bug.current_energy / bug.max_energy) * 100;
            if (energyPercent <= 0) {
                bug.current_health -= bug.health_subtract_on_low_energy_per_turn;
            } else if (energyPercent >= bug.energy_high_amount) {
                bug.current_health = Math.min(bug.max_health, bug.current_health + bug.health_increase_on_high_energy_per_turn);
                bug.weight = Math.min(100, bug.weight + bug.weight_increase_on_high_energy_per_turn);
            }

            // Обновление зрения и чувств в памяти
            const viewMap = visionService.getVisibleCells(bug);
            const feeling = this.calculateFeelings(bug);
            
            bug.addMemory({
                turnN: world.currentTurn,
                viewMap,
                feeling
            });

            bug.age++;
        });

        // Проверка смерти после всех обновлений
        bugsArray.forEach(bug => {
            if (bug.is_live && bug.current_health <= 0) {
                this.killBug(bug);
            }
        });

        // 3. Респаун еды и очистка
        this.updateFood();

        // 4. Управление временем хода
        this.updateTurnTime();

        world.currentTurn++;
        
        if (process.env.NODE_ENV !== 'test') {
            const nextTickDelay = Math.max(0, world.turnEndTime - Date.now());
            setTimeout(() => this.tick(), nextTickDelay);
        }
    }

    processActions() {
        actionService.processAllActions();
    }

    calculateFeelings(bug) {
        const feelings = [];
        const energyPercent = (bug.current_energy / bug.max_energy) * 100;
        
        let energyStatus = 'normal';
        if (energyPercent <= bug.energy_low_amount) energyStatus = 'low';
        if (energyPercent >= bug.energy_high_amount) energyStatus = 'high';
        
        feelings.push({ energy: energyStatus });
        feelings.push({ health: bug.current_health > 70 ? 'high' : (bug.current_health < 30 ? 'low' : 'normal') });
        
        if (bug.lastPainAngle !== undefined) {
            feelings.push({ pain: bug.lastPainAngle });
            delete bug.lastPainAngle;
        }

        if (bug.actionQueue.length > 0) {
            feelings.push({ currentAction: bug.actionQueue[0].actionId });
        }
        
        return feelings;
    }

    killBug(bug) {
        bug.is_live = false;
        if (bug.weight > 0) {
            const food = new Food(bug.x, bug.y, bug.weight, 2);
            world.grid[bug.x][bug.y] = food;
            world.food.push(food);
        } else {
            world.grid[bug.x][bug.y] = null;
        }
    }

    updateFood() {
        // Уменьшение общего лимита калорий
        world.feedAmount = Math.max(0, world.feedAmount - world.subtractFeedPerTurn);
        // Очистка съеденной еды и добавление новой (упрощенно)
        world.food = world.food.filter(f => f.amount > 0);
    }

    updateTurnTime() {
        // Логика изменения decisionTime (1-30 сек) в зависимости от активности
        world.turnEndTime = Date.now() + (world.decisionTime * 1000);
    }
}

module.exports = new GameEngine();
