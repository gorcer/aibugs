const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const ACTIONS = require('../src/constants/Actions');

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

    test('POST /api/action/:unitUid - should queue an action plan', async () => {
        const response = await request(app)
            .post(`/api/actions/action/${unitUid}`)
            .send({
                initTourN: world.currentTurn + 1,
                actions: [{ actionId: ACTIONS.MOVE, payload: {} }]
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('plan_accepted');
    });

    test('POST /api/action/:unitUid - should return error if actions is not an array', async () => {
        const response = await request(app)
            .post(`/api/actions/action/${unitUid}`)
            .send({
                initTourN: world.currentTurn + 2,
                actions: { actionId: ACTIONS.MOVE }
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Actions must be an array');
    });
});
