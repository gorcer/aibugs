const request = require('supertest');
const express = require('express');
const gameRoutes = require('../src/routes/gameRoutes');
const world = require('../src/models/World');
const actionService = require('../src/services/ActionService');
const gameEngine = require('../src/services/GameEngine');
const Food = require('../src/models/Food');
const ACTIONS = require('../src/constants/Actions');

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);

describe('AiBugs Food Mechanics Tests', () => {
    let apiKey;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'foodUser', password: 'password' });
        apiKey = res.body.apiKey;
    });

    test('Food should disappear when eaten and new food should spawn', async () => {
        // 1. Подготовка: очищаем мир и ставим одну еду перед жуком
        world.food = [];
        world.initGrid();
        world.feedAmount = 1000;
        world.feedCount = 5;
        gameEngine.isRunning = true;

        const res = await request(app)
            .post('/api/addUnit')
            .set('x-api-key', apiKey)
            .send({ name: 'HungryBug', x: 10, y: 10, angle: 0 });
        const bugUid = res.body.uid;
        const bug = world.bugs.get(bugUid);
        bug.feed_speed = 10;

        // Создаем еду с малым количеством
        const foodX = 11, foodY = 10;
        const smallFood = new Food(foodX, foodY, 5);
        world.food.push(smallFood);
        world.grid[foodX][foodY] = smallFood;

        // 2. Жук кусает еду
        await request(app)
            .post(`/api/action/${bugUid}`)
            .set('x-api-key', apiKey)
            .send({ initTourN: world.currentTurn, actions: [{ actionId: ACTIONS.BITE, payload: {} }] });

        // 3. Выполняем тик. Еда должна быть съедена и удалена, новая должна появиться
        gameEngine.tick();

        // Проверяем, что старая еда исчезла из сетки (или заменена новой)
        const cellContent = world.grid[foodX][foodY];
        expect(cellContent).not.toBe(smallFood);
        
        // Проверяем, что количество элементов еды стремится к feedCount
        expect(world.food.length).toBe(world.feedCount);

        // Проверяем, что суммарный объем не превышает world.feedAmount
        const totalAmount = world.food.reduce((sum, f) => sum + f.amount, 0);
        expect(totalAmount).toBeLessThanOrEqual(world.feedAmount);
    });
});
