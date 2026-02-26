const express = require('express');
const path = require('path');
const gameRoutes = require('./routes/gameRoutes');
const gameEngine = require('./services/GameEngine');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '../front')));
app.use('/api', gameRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    gameEngine.init();
});
