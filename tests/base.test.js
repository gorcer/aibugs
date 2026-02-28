const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const dbService = require('../src/services/DbService');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs Base API Tests', () => {
    let unitUid;
    let apiKey;

    beforeAll(async () => {
        dbService.clearUsers();
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'baseUser', password: 'password' });
        apiKey = res.body.apiKey;
    });

    test('POST /api/addUnit - should add a new bug', async () => {
        const response = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
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
        const addRes = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'VisionBug', x: 5, y: 5, angle: 0 });
        const uid = addRes.body.uid;

        const response = await request(app)
            .get(`/api/watch/${uid}`)
            .set('x-api-key', apiKey);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('viewMap');
        expect(Array.isArray(response.body.viewMap)).toBe(true);
    });
});
