const dbService = require('../services/DbService');

module.exports = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API Key required' });
    }

    const user = dbService.getUserByApiKey(apiKey);
    if (!user) {
        return res.status(401).json({ error: 'Invalid API Key' });
    }

    req.user = user;
    next();
};
