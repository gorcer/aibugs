const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs API Tests', () => {
    let unitUid;

    test('POST /api/addUnit - should add a new bug', async () => {
        const response = await request(app)
            .post('/api/addUnit')
            .send({
                name: 'TestBug',
                x: 10,
                y: 10,
                angle: 0
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('uid');
        unitUid = response.body.uid;
    });

    test('GET /api/watch/:unitUid - should return vision data', async () => {
        const response = await request(app).get(`/api/watch/${unitUid}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('viewMap');
        expect(Array.isArray(response.body.viewMap)).toBe(true);
    });

    test('POST /api/action/:unitUid - should queue an action', async () => {
        const response = await request(app)
            .post(`/api/action/${unitUid}`)
            .send({
                initTourN: 0,
                actionId: 1, // move
                payload: {}
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('queued');
    });

    test('POST /api/action/:unitUid - should return error if action already planned for the turn', async () => {
        const response = await request(app)
            .post(`/api/action/${unitUid}`)
            .send({
                initTourN: 0,
                actionId: 2, // rotate
                payload: { angle: 90 }
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Action already planned for this turn');
    });

    test('GET /api/feel/:unitUid - should return feelings', async () => {
        const response = await request(app).get(`/api/feel/${unitUid}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('feeling');
    });

    test('Bite action - should decrease victim health/weight and increase attacker energy', async () => {
        // 1. Создаем атакующего жука
        const attackerRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Attacker', x: 20, y: 20, angle: 0 }); // Смотрит вправо (x+)
        const attackerUid = attackerRes.body.uid;

        // 2. Создаем жертву справа от атакующего
        const victimRes = await request(app)
            .post('/api/addUnit')
            .send({ name: 'Victim', x: 21, y: 20, angle: 180 });
        const victimUid = victimRes.body.uid;

        const attackerBug = world.bugs.get(attackerUid);
        const victimBug = world.bugs.get(victimUid);

        // Уменьшаем энергию, чтобы увидеть прирост после укуса
        attackerBug.current_energy = 5000;
        const initialAttackerEnergy = attackerBug.current_energy;
        const initialVictimHealth = victimBug.current_health;
        const initialVictimWeight = victimBug.weight;

        // 3. Планируем укус
        await request(app)
            .post(`/api/action/${attackerUid}`)
            .send({
                initTourN: world.currentTurn,
                actionId: 3, // bite
                payload: {}
            });

        // 4. Выполняем тик движка вручную для обработки действия
        const actionService = require('../src/services/ActionService');
        actionService.processAllActions();

        // 5. Проверяем результаты
        expect(victimBug.current_health).toBeLessThan(initialVictimHealth);
        expect(victimBug.weight).toBeLessThan(initialVictimWeight);
        expect(attackerBug.current_energy).toBeGreaterThan(initialAttackerEnergy);

        // 6. Проверяем, что жертва чувствует боль (нужно вызвать расчет чувств)
        const gameEngine = require('../src/services/GameEngine');
        const feelings = gameEngine.calculateFeelings(victimBug);
        const painFeeling = feelings.find(f => f.pain !== undefined);
        expect(painFeeling).toBeDefined();
    });
});
