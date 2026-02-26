const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const actionService = require('../src/services/ActionService');
const gameEngine = require('../src/services/GameEngine');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs Bite Interaction Tests', () => {
    test('Bite action - should decrease victim health/weight and increase attacker energy', async () => {
        const attackerRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Attacker', x: 40, y: 40, angle: 0 });
        const attackerUid = attackerRes.body.uid;

        const victimRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Victim', x: 41, y: 40, angle: 180 });
        const victimUid = victimRes.body.uid;

        const attackerBug = world.bugs.get(attackerUid);
        const victimBug = world.bugs.get(victimUid);

        attackerBug.current_energy = 5000;
        const initialAttackerEnergy = attackerBug.current_energy;
        const initialVictimHealth = victimBug.current_health;

        await request(app)
            .post(`/api/action/${attackerUid}`)
            .send({
                initTourN: world.currentTurn,
                actionId: 3,
                payload: {}
            });

        actionService.processAllActions();

        expect(victimBug.current_health).toBeLessThan(initialVictimHealth);
        expect(attackerBug.current_energy).toBeGreaterThan(initialAttackerEnergy);

        const feelings = gameEngine.calculateFeelings(victimBug);
        expect(feelings.find(f => f.pain !== undefined)).toBeDefined();
    });

    test('Bite until death and eating corpse - should follow game logic', async () => {
        // 1. Создаем атакующего и жертву
        const attackerRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Killer', x: 50, y: 50, angle: 0 });
        const attackerUid = attackerRes.body.uid;

        const victimRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Prey', x: 51, y: 50, angle: 180 });
        const victimUid = victimRes.body.uid;

        const attackerBug = world.bugs.get(attackerUid);
        const victimBug = world.bugs.get(victimUid);

        // Устанавливаем жертве мало здоровья, чтобы она умерла от одного укуса
        victimBug.current_health = 1;
        victimBug.weight = 50;
        attackerBug.current_energy = 1000;

        // 2. Атакующий кусает жертву
        // Убеждаемся, что GameEngine запущен для корректной работы tick
        gameEngine.isRunning = true;
        const currentTurn = world.currentTurn;
        
        await request(app)
            .post(`/api/action/${attackerUid}`)
            .send({ initTourN: currentTurn, actionId: 3, payload: {} });

        // 3. Проверяем смерть жертвы и превращение в еду
        gameEngine.tick();

        expect(victimBug.is_live).toBe(false);
        const foodAtCell = world.grid[51][50];
        expect(foodAtCell.constructor.name).toBe('Food');
        expect(foodAtCell.type).toBe(2); // Мертвый жук
        expect(foodAtCell.amount).toBe(49); // 50 - 1 (урон от укуса)

        // 4. Атакующий ест труп (еще один укус по той же клетке)
        const energyBeforeEating = attackerBug.current_energy;
        
        await request(app)
            .post(`/api/action/${attackerUid}`)
            .send({ initTourN: world.currentTurn + 1, actionId: 3, payload: {} });

        actionService.processAllActions();

        // 5. Проверяем показатели после поедания
        expect(attackerBug.current_energy).toBe(energyBeforeEating + attackerBug.feed_speed);
        expect(foodAtCell.amount).toBe(49 - attackerBug.feed_speed);
    });
});
