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
});
