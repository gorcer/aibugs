const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const gameEngine = require('../src/services/GameEngine');
const ACTIONS = require('../src/constants/Actions');
const dbService = require('../src/services/DbService');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs Movement Mechanics Tests', () => {
    let apiKey;

    beforeAll(async () => {
        dbService.clearUsers();
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'moveUser', password: 'password' });
        apiKey = res.body.apiKey;
    });

    test('Bug with low energy should move slower (require multiple turns)', async () => {
        world.initGrid();
        gameEngine.isRunning = true;

        const res = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'SlowBug', x: 10, y: 10, angle: 0 });
        const bugUid = res.body.uid;
        const bug = world.bugs.get(bugUid);

        // Устанавливаем низкую энергию (ниже energy_low_amount)
        bug.current_energy = (bug.max_energy * bug.energy_low_amount / 100) - 1;
        
        // При max_speed = 1 и multiplier = 0.5 (из Bug.js), прогресс за ход будет 0.5
        // Потребуется 2 тика, чтобы прогресс стал >= 1 (0.5 * 2 = 1.0)

        await request(app)
            .post(`/api/action/${bugUid}`)
            .set('x-api-key', apiKey)
            .send({ initTourN: world.currentTurn, actions: [{ actionId: ACTIONS.MOVE, payload: {} }] });

        const initialX = bug.x;

        // Тик 1: прогресс 0.5 (так как speed_multiply_on_low_energy = 0.5)
        gameEngine.tick();
        expect(bug.x).toBe(initialX);
        expect(bug.actionQueue.length).toBe(1);

        // Тик 2: прогресс 1.0 -> перемещение
        gameEngine.tick();
        expect(bug.x).toBe(initialX + 1);
        expect(bug.actionQueue.length).toBe(0);
    });
});
