const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const gameEngine = require('../src/services/GameEngine');
const ACTIONS = require('../src/constants/Actions');
const Food = require('../src/models/Food');
const dbService = require('../src/services/DbService');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs Memory and brainSleeping Tests', () => {
    let apiKey;

    beforeAll(async () => {
        dbService.clearUsers();
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'memoryUser', password: 'password' });
        apiKey = res.body.apiKey;
    });

    beforeEach(() => {
        world.initGrid();
        world.bugs.clear();
        world.food = [];
        gameEngine.isRunning = true;
    });

    test('1) brainSleeping should become false when bug is bitten during a plan', async () => {
        // Создаем жука-жертву с планом на 3 хода
        const victimRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'Victim', x: 10, y: 10, angle: 0 });
        const victimUid = victimRes.body.uid;
        const victimBug = world.bugs.get(victimUid);

        await request(app)
            .post(`/api/action/${victimUid}`)
            .set('x-api-key', apiKey)
            .send({
                initTourN: world.currentTurn,
                actions: [
                    { actionId: ACTIONS.MOVE, payload: {} },
                    { actionId: ACTIONS.MOVE, payload: {} },
                    { actionId: ACTIONS.MOVE, payload: {} }
                ]
            });

        expect(victimBug.brainSleeping).toBe(true);

        // Ход 1: Жук начинает движение
        gameEngine.tick();
        expect(victimBug.brainSleeping).toBe(true);

        // Создаем атакующего и кусаем жертву на 2-м ходу
        const attackerRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'Attacker', x: victimBug.x + 1, y: victimBug.y, angle: 180 });
        const attackerUid = attackerRes.body.uid;

        await request(app)
            .post(`/api/action/${attackerUid}`)
            .set('x-api-key', apiKey)
            .send({
                initTourN: world.currentTurn,
                actions: [{ actionId: ACTIONS.BITE, payload: {} }]
            });

        // Ход 2: Атакующий кусает, план жертвы должен прерваться
        gameEngine.tick();
        
        expect(victimBug.brainSleeping).toBe(false);
        const lastMemory = victimBug.memory[victimBug.memory.length - 1];
        expect(lastMemory.brainSleeping).toBe(false);
    });

    test('2) brainSleeping should become false if bite target disappears (Fail status)', async () => {
        const bugRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'HungryBug', x: 20, y: 20, angle: 0 });
        const bugUid = bugRes.body.uid;
        const bug = world.bugs.get(bugUid);

        // Ставим еду, которой хватит на 1 укус
        const uid = world.food.size();
        const food = new Food(uid, 21, 20, 1);
        world.food.push(food);
        world.grid[21][20] = food;

        // План: укусить 3 раза
        await request(app)
            .post(`/api/action/${bugUid}`)
            .set('x-api-key', apiKey)
            .send({
                initTourN: world.currentTurn,
                actions: [
                    { actionId: ACTIONS.BITE, payload: {} },
                    { actionId: ACTIONS.BITE, payload: {} },
                    { actionId: ACTIONS.BITE, payload: {} }
                ]
            });

        // Ход 1: Ест еду, она исчезает
        gameEngine.tick();
        expect(bug.brainSleeping).toBe(true); 

        // Ход 2: Пытается укусить пустую клетку -> Fail -> brainSleeping = false
        gameEngine.tick();
        expect(bug.brainSleeping).toBe(false);
        const lastMemory = bug.memory[bug.memory.length - 1];
        expect(lastMemory.lastAction.status).toBe('Fail');
    });

    test('3) brainSleeping should be true during plan and false after successful completion', async () => {
        const bugRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'Walker', x: 30, y: 30, angle: 0 });
        const bugUid = bugRes.body.uid;
        const bug = world.bugs.get(bugUid);

        await request(app)
            .post(`/api/action/${bugUid}`)
            .set('x-api-key', apiKey)
            .send({
                initTourN: world.currentTurn,
                actions: [
                    { actionId: ACTIONS.MOVE, payload: {} },
                    { actionId: ACTIONS.MOVE, payload: {} },
                    { actionId: ACTIONS.MOVE, payload: {} }
                ]
            });

        // Ход 1: В очереди 3 действия -> выполнили 1, осталось 2. brainSleeping = true (2 > 1)
        gameEngine.tick();
        expect(bug.brainSleeping).toBe(true);

        // Ход 2: В очереди 2 действия -> выполнили 1, осталось 1. brainSleeping = false (1 не > 1)
        gameEngine.tick();
        expect(bug.brainSleeping).toBe(false);

        // Ход 3: Последнее действие выполнено
        gameEngine.tick();
        expect(bug.brainSleeping).toBe(false);
        
        const lastMemory = bug.memory[bug.memory.length - 1];
        expect(lastMemory.brainSleeping).toBe(false);
    });
});
