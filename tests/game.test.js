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
});
