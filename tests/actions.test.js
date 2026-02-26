const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');

const app = express();
app.use(express.json());
app.use('/api/actions', gameRoutes);

describe('AiBugs Actions API Tests', () => {
    let unitUid;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/actions/addUnit')
            .send({ name: 'ActionBug', x: 30, y: 30, angle: 0 });
        unitUid = res.body.uid;
    });

    test('POST /api/action/:unitUid - should queue an action', async () => {
        const response = await request(app)
            .post(`/api/actions/action/${unitUid}`)
            .send({
                initTourN: world.currentTurn + 1,
                actionId: 1,
                payload: {}
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('queued');
    });

    test('POST /api/action/:unitUid - should return error if action already planned for the turn', async () => {
        const turn = world.currentTurn + 2;
        await request(app)
            .post(`/api/actions/action/${unitUid}`)
            .send({ initTourN: turn, actionId: 1, payload: {} });

        const response = await request(app)
            .post(`/api/actions/action/${unitUid}`)
            .send({ initTourN: turn, actionId: 2, payload: {} });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Action already planned for this turn');
    });
});
