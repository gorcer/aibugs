const express = require('express');
const path = require('path');
const http = require('http');
const gameRoutes = require('./routes/gameRoutes');
const gameEngine = require('./services/GameEngine');
const socketService = require('./services/SocketService');

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.use(express.static(path.join(__dirname, '../front')));

app.get('/ai', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/ai.html'));
});

app.get('/farm', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/farm.html'));
});

app.use('/api', gameRoutes);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        socketService.init(server);
        gameEngine.init();
    });
}

module.exports = app;
