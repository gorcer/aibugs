const world = require('../models/World');
const Food = require('../models/Food');
const visionService = require('./VisionService');
const actionService = require('./ActionService');
const socketService = require('./SocketService');

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
            bug.current_energy = Math.max(0, bug.current_energy - bug.energy_consumption_per_turn);
            
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
            
            const memoryRecord = {
                turnN: world.currentTurn,
                viewMap,
                feeling,
                lastAction: bug.lastActionResult || null,
                brainSleeping: bug.brainSleeping
            };
            bug.addMemory(memoryRecord);
            delete bug.lastActionResult;
            socketService.sendUpdate(bug.uid, bug.memory);

            bug.age++;
        });

        // Проверка смерти после всех обновлений
        world.bugs.forEach(bug => {
            if (bug.is_live && (bug.current_health <= 0 || bug.weight <= 0)) {
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
        
        feelings.push({ energy: bug.current_energy });
        feelings.push({ health: bug.current_health });
        
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
        // Уменьшение общего лимита калорий за ход
        world.feedAmount = Math.max(0, world.feedAmount - world.subtractFeedPerTurn);

        // 1. Очистка съеденной еды из массива и сетки
        world.food = world.food.filter(f => {
            if (f.amount <= 0) {
                if (world.grid[f.x][f.y] === f) {
                    world.grid[f.x][f.y] = null;
                }
                return false;
            }
            return true;
        });

        // 2. Добавление новой еды, если её меньше чем feedCount
        const currentTotalAmount = world.food.reduce((sum, f) => sum + f.amount, 0);
        let remainingToSpawn = world.feedCount - world.food.length;
        let caloriesToDistribute = world.feedAmount - currentTotalAmount;

        if (remainingToSpawn > 0 && caloriesToDistribute > 0) {
            for (let i = 0; i < remainingToSpawn; i++) {
                const x = Math.floor(Math.random() * world.width);
                const y = Math.floor(Math.random() * world.height);

                if (world.isCellEmpty(x, y)) {
                    const amount = Math.floor(caloriesToDistribute / (remainingToSpawn - i));
                    const food = new Food(x, y, amount);
                    world.food.push(food);
                    world.grid[x][y] = food;
                    caloriesToDistribute -= amount;
                }
            }
        }
    }

    updateTurnTime() {
        const totalBugs = world.bugs.size;
        if (totalBugs > 0) {
            const activeBugs = Array.from(world.bugs.values()).filter(bug => 
                bug.is_live && (bug.lastActionTurn === world.currentTurn || bug.actionQueue.length > 0)
            ).length;

            const activityPercent = (activeBugs / totalBugs) * 100;

            if (activityPercent < 100) {
                // Увеличиваем время на 10%, если не все успели
                world.decisionTime = Math.min(30, world.decisionTime * 1.1);
            } else {
                // Сокращаем время на 10%, если успели все
                world.decisionTime = Math.max(1, world.decisionTime * 0.9);
            }
        }

        world.turnEndTime = Date.now() + (world.decisionTime * 1000);
    }
}

module.exports = new GameEngine();
