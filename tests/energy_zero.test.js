const request = require('supertest');
const app = require('../src/app');
const world = require('../src/models/World');
const dbService = require('../src/services/DbService');
const actionService = require('../src/services/ActionService');

describe('Zero Energy Movement Test', () => {
    let apiKey;
    let bugUid;

    beforeAll(async () => {
        dbService.clearUsers();
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'password' });
        apiKey = res.body.apiKey;
    });

    test('Bug with 0 energy and 40% health should move slowly and reach target', async () => {
        // 1. Создаем жука в точке (5, 5)
        const createRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'EnergyBug', x: 5, y: 5, angle: 0 });
        
        bugUid = createRes.body.uid;
        const bug = world.bugs.get(bugUid);

        // 2. Устанавливаем состояние: 0 энергии, 40 здоровья
        bug.current_energy = 0;
        bug.current_health = 40;

        // 3. Отправляем план на 3 шага вперед (actionId: 1 - MOVE)
        const plan = [
            { actionId: 1, payload: {} },
            { actionId: 1, payload: {} },
            { actionId: 1, payload: {} }
        ];

        await request(app)
            .post(`/api/action/${bugUid}`)
            .set('x-api-key', apiKey)
            .send({ initTourN: world.currentTurn, actions: plan });

        // 4. Выполняем обработку действий (имитируем тики)
        // При 0 энергии speedMultiplier = 0.5. 3 шага * 2 тика = 6 вызовов processAllActions
        for (let i = 0; i < 6; i++) {
            actionService.processAllActions();
        }
        
        // Проверяем, что жук добрался до (8, 5)
        expect(bug.x).toBe(8);
        expect(bug.y).toBe(5);
        expect(bug.actionQueue.length).toBe(0);
    });
});
